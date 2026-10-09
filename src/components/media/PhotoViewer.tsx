import { Image } from 'expo-image';
import { MediaImageXmark, Xmark } from 'iconoir-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { originalImageUrl } from '@/lib/supabase/storage';
import { colors, layout, radius, spacing, typography } from '@/theme';

const MAX_SCALE = 4;
/** How far a pinch may go past the limits before it springs back. */
const MIN_PINCH_SCALE = 0.7;
const MAX_PINCH_SCALE = MAX_SCALE * 1.5;
const DOUBLE_TAP_SCALE = 2.5;
/** Above this the photo counts as zoomed: pans move it, paging and swipe-down are off. */
const ZOOMED = 1.01;
/** Drag past an edge moves this much of the finger's travel. */
const RUBBER_BAND = 0.35;
const PAGE_VELOCITY = 500;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const FADE_MS = 200;
const SETTLE_MS = 240;
const PAGE_MS = 260;
const ICON_SIZE = 24;
const FAILED_ICON_SIZE = 40;

/** What one pan does, decided once it has moved past the touch slop. */
const MODE_NONE = 0;
const MODE_ZOOM_PAN = 1;
const MODE_PAGE = 2;
const MODE_DISMISS = 3;
const MODE_IGNORE = 4;

const PAGING_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

const settleTiming ={ duration: SETTLE_MS, easing: Easing.out(Easing.cubic) };
const pageTiming = { duration: PAGE_MS, easing: Easing.out(Easing.cubic) };

type NaturalSize = { width: number; height: number };

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

/** The original behind a resized Supabase thumbnail; anything else as is. */
function fullSizeSource(photo: ImageSourcePropType): ImageSourcePropType {
  if (typeof photo === 'object' && !Array.isArray(photo) && typeof photo.uri === 'string') {
    const uri = originalImageUrl(photo.uri);
    return uri === photo.uri ? photo : { ...photo, uri };
  }
  return photo;
}

type PhotoViewerProps = {
  photos: readonly ImageSourcePropType[];
  initialIndex: number;
  /** Runs after the closing fade; the screen pops itself. */
  onClosed: () => void;
};

/**
 * Full-screen photos (route and ride detail, user decision 2026-10-09; no design). Pages
 * horizontally, pinch and double-tap zoom with panning while zoomed (paging is off then), and a
 * swipe down closes the unzoomed photo with the background fading along. Zoom belongs to the
 * photo on screen and resets when the page changes. Reduced motion drops the fades.
 */
export function PhotoViewer({ photos, initialIndex, onClosed }: PhotoViewerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const screen = useWindowDimensions();
  const count = photos.length;

  const [size, setSize] = useState({ width: screen.width, height: screen.height });
  const [page, setPage] = useState(initialIndex);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());

  const width = useSharedValue(size.width);
  const height = useSharedValue(size.height);
  const index = useSharedValue(initialIndex);
  const pagerX = useSharedValue(-initialIndex * size.width);
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const visibility = useSharedValue(reduceMotion ? 1 : 0);
  const naturalSizes = useSharedValue<Record<number, NaturalSize>>({});
  const mode = useSharedValue(MODE_NONE);
  const pinching = useSharedValue(false);
  /** A pinch happened during the current pan: its end settles instead of gliding. */
  const pinchedInPan = useSharedValue(false);
  const pinchStart = useSharedValue({ scale: 1, x: 0, y: 0, focalX: 0, focalY: 0 });
  /** Pager position a page drag started from (it may still be settling from the last one). */
  const pageStart = useSharedValue(0);
  /** Set once a close has started (button, back or swipe), so it runs once. */
  const closing = useSharedValue(false);

  const fadeMs = reduceMotion ? 0 : FADE_MS;

  useEffect(() => {
    visibility.set(withTiming(1, { duration: fadeMs }));
  }, [fadeMs, visibility]);

  const finishClose = useCallback(() => {
    onClosed();
  }, [onClosed]);

  const close = useCallback(() => {
    if (closing.get()) {
      return;
    }
    closing.set(true);
    visibility.set(
      withTiming(0, { duration: fadeMs }, () => {
        scheduleOnRN(finishClose);
      }),
    );
  }, [closing, fadeMs, finishClose, visibility]);

  // Android back closes with the same fade as the close button.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout;
    if (next.width === size.width && next.height === size.height) {
      return;
    }
    setSize({ width: next.width, height: next.height });
    width.set(next.width);
    height.set(next.height);
    pagerX.set(-index.get() * next.width);
  };

  const reportSize = useCallback(
    (pageIndex: number, natural: NaturalSize) => {
      if (natural.width > 0 && natural.height > 0) {
        naturalSizes.set({ ...naturalSizes.get(), [pageIndex]: natural });
      }
    },
    [naturalSizes],
  );

  const reportFailed = useCallback((pageIndex: number) => {
    setFailed((current) => new Set(current).add(pageIndex));
  }, []);

  const showPage = useCallback((next: number) => setPage(next), []);

  const gesture = useMemo(() => {
    /** How far the photo may move at `s` before an edge comes into view (0 when it fits). */
    const bounds = (s: number) => {
      'worklet';
      const W = width.get();
      const H = height.get();
      const natural = naturalSizes.get()[index.get()];
      // Until the photo reports its size, treat it as filling the page.
      const fit = natural ? Math.min(W / natural.width, H / natural.height) : 1;
      const contentW = natural ? natural.width * fit : W;
      const contentH = natural ? natural.height * fit : H;
      return {
        x: Math.max(0, (contentW * s - W) / 2),
        y: Math.max(0, (contentH * s - H) / 2),
      };
    };

    const resetZoom = (animated: boolean) => {
      'worklet';
      if (animated) {
        // A pan during the zoom-out may move the photo; it ends centred unless a pinch interrupts.
        scale.set(
          withTiming(1, settleTiming, (finished) => {
            if (finished) {
              offsetX.set(0);
              offsetY.set(0);
            }
          }),
        );
        offsetX.set(withTiming(0, settleTiming));
        offsetY.set(withTiming(0, settleTiming));
      } else {
        scale.set(1);
        offsetX.set(0);
        offsetY.set(0);
      }
    };

    /** Brings scale back between 1 and the maximum and the photo back inside its edges. */
    const settle = () => {
      'worklet';
      const current = scale.get();
      if (current <= ZOOMED) {
        resetZoom(true);
        return;
      }
      const target = Math.min(current, MAX_SCALE);
      // Shrinking back from an over-pinch keeps the same spot in the middle.
      const ratio = target / current;
      const edge = bounds(target);
      scale.set(withTiming(target, settleTiming));
      offsetX.set(withTiming(clamp(offsetX.get() * ratio, -edge.x, edge.x), settleTiming));
      offsetY.set(withTiming(clamp(offsetY.get() * ratio, -edge.y, edge.y), settleTiming));
    };

    /** Adds a finger move, at a fraction past an edge (rubber band). */
    const follow = (value: number, change: number, edge: number) => {
      'worklet';
      const outward = (value >= edge && change > 0) || (value <= -edge && change < 0);
      return value + (outward ? change * RUBBER_BAND : change);
    };

    const pinch = Gesture.Pinch()
      .onStart((event) => {
        // A pinch that lands during a page swipe or swipe-down is ignored for that gesture.
        if (mode.get() === MODE_PAGE || mode.get() === MODE_DISMISS) {
          return;
        }
        mode.set(MODE_ZOOM_PAN);
        pinching.set(true);
        pinchedInPan.set(true);
        pinchStart.set({
          scale: scale.get(),
          x: offsetX.get(),
          y: offsetY.get(),
          focalX: event.focalX - width.get() / 2,
          focalY: event.focalY - height.get() / 2,
        });
      })
      .onUpdate((event) => {
        if (!pinching.get()) {
          return;
        }
        const start = pinchStart.get();
        const next = clamp(start.scale * event.scale, MIN_PINCH_SCALE, MAX_PINCH_SCALE);
        // The spot that was under the fingers stays under them as they spread and move.
        const focalX = event.focalX - width.get() / 2;
        const focalY = event.focalY - height.get() / 2;
        offsetX.set(focalX - (next * (start.focalX - start.x)) / start.scale);
        offsetY.set(focalY - (next * (start.focalY - start.y)) / start.scale);
        scale.set(next);
      })
      .onEnd(() => {
        if (pinching.get()) {
          settle();
        }
      })
      .onFinalize(() => {
        pinching.set(false);
      });

    const pan = Gesture.Pan()
      .minDistance(10)
      .averageTouches(true)
      .onBegin(() => {
        mode.set(MODE_NONE);
        pinchedInPan.set(false);
      })
      .onChange((event) => {
        if (mode.get() === MODE_NONE) {
          // Two fingers are a pinch even when they drift before the pinch begins.
          if (scale.get() > ZOOMED || event.numberOfPointers > 1) {
            mode.set(MODE_ZOOM_PAN);
          } else if (Math.abs(event.translationY) > Math.abs(event.translationX)) {
            mode.set(event.translationY > 0 ? MODE_DISMISS : MODE_IGNORE);
          } else {
            mode.set(MODE_PAGE);
            // Picks up from where the pager is, without jumping by the touch slop.
            pageStart.set(pagerX.get() - event.translationX);
          }
        }

        if (mode.get() === MODE_ZOOM_PAN) {
          // The pinch moves the photo with the fingers while both are down.
          if (pinching.get()) {
            return;
          }
          const edge = bounds(scale.get());
          offsetX.set(follow(offsetX.get(), event.changeX, edge.x));
          offsetY.set(follow(offsetY.get(), event.changeY, edge.y));
        } else if (mode.get() === MODE_PAGE) {
          const position = pageStart.get() + event.translationX;
          const last = -(count - 1) * width.get();
          // Past the first or last photo it stretches.
          pagerX.set(
            position > 0
              ? position * RUBBER_BAND
              : position < last
                ? last + (position - last) * RUBBER_BAND
                : position,
          );
        } else if (mode.get() === MODE_DISMISS) {
          // Back above the start it barely moves: only down closes.
          dismissY.set(
            event.translationY > 0 ? event.translationY : event.translationY * RUBBER_BAND * 0.5,
          );
        }
      })
      .onEnd((event) => {
        if (mode.get() === MODE_ZOOM_PAN) {
          if (pinching.get()) {
            return;
          }
          // After a pinch, settle (scale may still be animating) instead of gliding.
          if (pinchedInPan.get() || scale.get() <= ZOOMED) {
            settle();
            return;
          }
          const edge = bounds(scale.get());
          // Inside the edges a flick glides on; past one it springs back.
          offsetX.set(
            Math.abs(offsetX.get()) > edge.x
              ? withTiming(clamp(offsetX.get(), -edge.x, edge.x), settleTiming)
              : withDecay({ velocity: event.velocityX, clamp: [-edge.x, edge.x] }),
          );
          offsetY.set(
            Math.abs(offsetY.get()) > edge.y
              ? withTiming(clamp(offsetY.get(), -edge.y, edge.y), settleTiming)
              : withDecay({ velocity: event.velocityY, clamp: [-edge.y, edge.y] }),
          );
        } else if (mode.get() === MODE_PAGE) {
          const W = width.get();
          const current = index.get();
          let target = current;
          if (event.velocityX < -PAGE_VELOCITY) {
            target = current + 1;
          } else if (event.velocityX > PAGE_VELOCITY) {
            target = current - 1;
          } else if (event.translationX < -W / 3) {
            target = current + 1;
          } else if (event.translationX > W / 3) {
            target = current - 1;
          }
          target = clamp(target, 0, count - 1);
          pagerX.set(withTiming(-target * W, pageTiming));
          if (target !== current) {
            index.set(target);
            resetZoom(false);
            scheduleOnRN(showPage, target);
          }
        } else if (mode.get() === MODE_DISMISS) {
          if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
            closing.set(true);
            const duration = reduceMotion ? 0 : FADE_MS;
            dismissY.set(withTiming(height.get(), { duration }));
            visibility.set(
              withTiming(0, { duration }, () => {
                scheduleOnRN(finishClose);
              }),
            );
          } else {
            dismissY.set(withTiming(0, settleTiming));
          }
        }
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((event, success) => {
        if (!success) {
          return;
        }
        if (scale.get() > ZOOMED) {
          resetZoom(true);
          return;
        }
        // Zoom in on the tapped spot, without showing past the photo's edges.
        const edge = bounds(DOUBLE_TAP_SCALE);
        const tapX = event.x - width.get() / 2;
        const tapY = event.y - height.get() / 2;
        scale.set(withTiming(DOUBLE_TAP_SCALE, settleTiming));
        offsetX.set(
          withTiming(clamp(tapX * (1 - DOUBLE_TAP_SCALE), -edge.x, edge.x), settleTiming),
        );
        offsetY.set(
          withTiming(clamp(tapY * (1 - DOUBLE_TAP_SCALE), -edge.y, edge.y), settleTiming),
        );
      });

    return Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [
    closing,
    count,
    dismissY,
    finishClose,
    height,
    index,
    mode,
    naturalSizes,
    offsetX,
    offsetY,
    pagerX,
    pageStart,
    pinchStart,
    pinchedInPan,
    pinching,
    reduceMotion,
    scale,
    showPage,
    visibility,
    width,
  ]);

  /** Screen reader paging (swipe up / down on the photo). */
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const target = clamp(page + step, 0, count - 1);
    if (target === page) {
      return;
    }
    scale.set(1);
    offsetX.set(0);
    offsetY.set(0);
    index.set(target);
    pagerX.set(withTiming(-target * size.width, { duration: reduceMotion ? 0 : PAGE_MS }));
    setPage(target);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      visibility.get() *
      interpolate(Math.abs(dismissY.get()), [0, height.get() * 0.4], [1, 0], Extrapolation.CLAMP),
  }));
  const pagerStyle = useAnimatedStyle(() => ({
    opacity: visibility.get(),
    transform: [{ translateX: pagerX.get() }],
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity:
      visibility.get() *
      interpolate(Math.abs(dismissY.get()), [0, DISMISS_DISTANCE], [1, 0], Extrapolation.CLAMP),
  }));

  const pageLabel = t('photoViewer.a11y.photo', { index: page + 1, total: count });

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={styles.viewport}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={
            failed.has(page) ? `${pageLabel}, ${t('photoViewer.a11y.failed')}` : pageLabel
          }
          accessibilityActions={count > 1 ? PAGING_ACTIONS : undefined}
          onAccessibilityAction={onAccessibilityAction}>
          <Animated.View
            style={[styles.pager, { width: size.width * count, height: size.height }, pagerStyle]}>
            {photos.map((photo, pageIndex) => (
              <View key={pageIndex} style={{ width: size.width, height: size.height }}>
                {/* Only the photo on screen and its neighbours are mounted (originals are big). */}
                {Math.abs(pageIndex - page) <= 1 ? (
                  <ViewerPage
                    photo={photo}
                    pageIndex={pageIndex}
                    current={index}
                    scale={scale}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    dismissY={dismissY}
                    height={size.height}
                    failed={failed.has(pageIndex)}
                    transitionMs={reduceMotion ? 0 : FADE_MS}
                    onSize={reportSize}
                    onFailed={reportFailed}
                  />
                ) : null}
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.chrome, { top: insets.top + spacing.sm }, chromeStyle]}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('actions.close')}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Xmark width={ICON_SIZE} height={ICON_SIZE} color={colors.textInverse} />
        </Pressable>
        {count > 1 ? (
          // Visual only: the photo's label already says "2 / 5" to screen readers.
          <View
            style={styles.counter}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <Text style={styles.counterLabel}>
              {t('photoViewer.counter', { index: page + 1, total: count })}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

type ViewerPageProps = {
  photo: ImageSourcePropType;
  pageIndex: number;
  current: SharedValue<number>;
  scale: SharedValue<number>;
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
  dismissY: SharedValue<number>;
  height: number;
  failed: boolean;
  transitionMs: number;
  onSize: (pageIndex: number, natural: NaturalSize) => void;
  onFailed: (pageIndex: number) => void;
};

/** One photo fitted to the screen; zoom and swipe-down move it only while it's the current one. */
function ViewerPage({
  photo,
  pageIndex,
  current,
  scale,
  offsetX,
  offsetY,
  dismissY,
  height,
  failed,
  transitionMs,
  onSize,
  onFailed,
}: ViewerPageProps) {
  const source = useMemo(() => fullSizeSource(photo), [photo]);
  // The thumbnail the strip already loaded shows until the original arrives.
  const placeholder = source === photo ? undefined : photo;

  const style = useAnimatedStyle(() => {
    if (current.get() !== pageIndex) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    const drag = Math.abs(dismissY.get());
    const shrink = interpolate(drag, [0, height], [1, 0.85], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: offsetX.get() },
        { translateY: offsetY.get() + dismissY.get() },
        { scale: scale.get() * shrink },
      ],
    };
  });

  if (failed) {
    return (
      <View style={styles.failed}>
        <MediaImageXmark
          width={FAILED_ICON_SIZE}
          height={FAILED_ICON_SIZE}
          color={colors.mediaViewerMuted}
        />
      </View>
    );
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image
        source={source}
        placeholder={placeholder}
        placeholderContentFit="contain"
        contentFit="contain"
        transition={transitionMs}
        style={StyleSheet.absoluteFill}
        onLoad={(event) =>
          onSize(pageIndex, { width: event.source.width, height: event.source.height })
        }
        onError={() => onFailed(pageIndex)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.mediaViewerBackground,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  pager: {
    flexDirection: 'row',
  },
  failed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chrome: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    height: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    left: 0,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mediaViewerControl,
  },
  pressed: {
    opacity: 0.6,
  },
  counter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.mediaViewerControl,
  },
  counterLabel: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontVariant: ['tabular-nums'],
  },
});
