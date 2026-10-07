import { Image } from 'expo-image';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius, shadows } from '@/theme';

type Rect = { x: number; y: number; width: number; height: number };

type ExpandSource = {
  ref: RefObject<View | null>;
  /** The card's map artwork; the clone grows with it (cover, so it zooms in as it grows). */
  image: number;
  /** Card chrome (pill, buttons) drawn on the clone at first and faded out as it grows. */
  decorations?: ReactNode;
};

type Clone = Omit<ExpandSource, 'ref'> & { ref: ExpandSource['ref']; rect: Rect };

type Phase = 'idle' | 'expanding' | 'revealing' | 'covering' | 'collapsing';

type MapExpandContextValue = {
  /** Grows the card into the full screen, then calls `navigate` under the clone. */
  expand: (source: ExpandSource, navigate: () => void) => void;
  /**
   * Covers the map screen with the clone, calls `goBack` under it and shrinks the clone back
   * into the card it came from. False when there's no card to return to (nothing happens).
   */
  collapse: (goBack: () => void) => boolean;
  /** The map screen has drawn its map: the clone may fade away. */
  markTargetReady: () => void;
  /** The card currently stood in for by the clone (hidden so the clone seems to lift it). */
  activeSource: RefObject<View | null> | null;
  /** No clone covers the map screen, so its own chrome (the bottom sheet) can come in. */
  targetRevealed: boolean;
};

const EXPAND_MS = 440;
const REVEAL_MS = 240;
const COVER_MS = 160;
const COLLAPSE_MS = 380;
/** A slow map never holds the clone longer than this after the card has grown. */
const READY_TIMEOUT_MS = 600;
/** Emphasized decelerate: quick lift-off, long soft landing. */
const EASING = Easing.bezier(0.2, 0, 0, 1);

const MapExpandContext = createContext<MapExpandContextValue | null>(null);

/**
 * Discover's map card (05.01 `YUUe8`) growing into "Haritada keşfet" (07.01) and back. The map
 * screen lives on the root stack (no tab bar) while the card sits in a tab, which the native
 * zoom transition can't bridge, so a clone of the card animates above everything: it grows from
 * the card's frame to the screen, the map screen is pushed under it without animation and the
 * clone fades once the map is drawn. Going back runs it in reverse. Reduced motion skips it.
 */
export function MapExpandProvider({ children }: PropsWithChildren) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [clone, setClone] = useState<Clone | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const lastClone = useRef<Clone | null>(null);
  const navigateRef = useRef<(() => void) | null>(null);
  const goBackRef = useRef<(() => void) | null>(null);
  const targetReady = useRef(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const finish = useCallback(() => {
    clearTimeout(readyTimer.current);
    setPhase('idle');
    setClone(null);
  }, [setPhase]);

  const reveal = useCallback(() => {
    if (phaseRef.current === 'expanding') {
      clearTimeout(readyTimer.current);
      setPhase('revealing');
    }
  }, [setPhase]);

  const onExpanded = useCallback(() => {
    navigateRef.current?.();
    navigateRef.current = null;
    if (targetReady.current) {
      reveal();
    } else {
      readyTimer.current = setTimeout(reveal, READY_TIMEOUT_MS);
    }
  }, [reveal]);

  const onCovered = useCallback(() => {
    goBackRef.current?.();
    goBackRef.current = null;
    setPhase('collapsing');
  }, [setPhase]);

  // Each phase starts its animation once the clone for it is on screen.
  useEffect(() => {
    if (phase === 'expanding') {
      progress.set(
        withTiming(1, { duration: EXPAND_MS, easing: EASING }, (done) => {
          if (done) {
            scheduleOnRN(onExpanded);
          }
        }),
      );
    } else if (phase === 'revealing') {
      opacity.set(
        withTiming(0, { duration: REVEAL_MS }, (done) => {
          if (done) {
            scheduleOnRN(finish);
          }
        }),
      );
    } else if (phase === 'covering') {
      opacity.set(
        withTiming(1, { duration: COVER_MS }, (done) => {
          if (done) {
            scheduleOnRN(onCovered);
          }
        }),
      );
    } else if (phase === 'collapsing') {
      progress.set(
        withTiming(0, { duration: COLLAPSE_MS, easing: EASING }, (done) => {
          if (done) {
            scheduleOnRN(finish);
          }
        }),
      );
    }
  }, [phase, progress, opacity, onExpanded, finish, onCovered]);

  useEffect(() => () => clearTimeout(readyTimer.current), []);

  const expand = useCallback(
    (source: ExpandSource, navigate: () => void) => {
      if (phaseRef.current !== 'idle') {
        return;
      }
      const node = source.ref.current;
      if (reduceMotion || !node) {
        navigate();
        return;
      }
      node.measureInWindow((x, y, width, height) => {
        if (!width || !height || phaseRef.current !== 'idle') {
          navigate();
          return;
        }
        const next: Clone = { ...source, rect: { x, y, width, height } };
        lastClone.current = next;
        navigateRef.current = navigate;
        targetReady.current = false;
        progress.set(0);
        opacity.set(1);
        setClone(next);
        setPhase('expanding');
      });
    },
    [reduceMotion, progress, opacity, setPhase],
  );

  const collapse = useCallback(
    (goBack: () => void) => {
      const previous = lastClone.current;
      if (phaseRef.current !== 'idle' || reduceMotion || !previous?.ref.current) {
        return false;
      }
      goBackRef.current = goBack;
      progress.set(1);
      opacity.set(0);
      setClone(previous);
      setPhase('covering');
      return true;
    },
    [reduceMotion, progress, opacity, setPhase],
  );

  const markTargetReady = useCallback(() => {
    if (targetReady.current) {
      return;
    }
    targetReady.current = true;
    // Still growing: the clone fades as soon as it has covered the screen.
    if (phaseRef.current === 'expanding' && navigateRef.current === null) {
      reveal();
    }
  }, [reveal]);

  const value = useMemo<MapExpandContextValue>(
    () => ({
      expand,
      collapse,
      markTargetReady,
      activeSource: clone?.ref ?? null,
      targetRevealed: phase === 'idle' || phase === 'revealing',
    }),
    [expand, collapse, markTargetReady, clone, phase],
  );

  return (
    <MapExpandContext value={value}>
      {children}
      {clone ? <CloneOverlay clone={clone} progress={progress} opacity={opacity} /> : null}
    </MapExpandContext>
  );
}

function CloneOverlay({
  clone,
  progress,
  opacity,
}: {
  clone: Clone;
  progress: SharedValue<number>;
  opacity: SharedValue<number>;
}) {
  const { width, height } = useWindowDimensions();
  const { rect } = clone;

  const frameStyle = useAnimatedStyle(() => ({
    left: interpolate(progress.value, [0, 1], [rect.x, 0]),
    top: interpolate(progress.value, [0, 1], [rect.y, 0]),
    width: interpolate(progress.value, [0, 1], [rect.width, width]),
    height: interpolate(progress.value, [0, 1], [rect.height, height]),
    borderRadius: interpolate(progress.value, [0, 1], [radius.media, 0]),
    opacity: opacity.value,
  }));
  // Shadow on the frame, clipping on the media inside it (a clipped view would cut its shadow).
  const mediaStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [radius.media, 0]),
  }));
  // The pill, button and white stroke belong to the card: gone by a quarter of the way.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    // Blocks touches while it runs, so the card can't be tapped twice or the map half-used.
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.frame, frameStyle]}>
        <Animated.View style={[styles.media, mediaStyle]}>
          <Image source={clone.image} contentFit="cover" style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, chromeStyle]} pointerEvents="none">
          <View style={styles.stroke} />
          {clone.decorations}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function useMapExpand() {
  const value = use(MapExpandContext);
  if (!value) {
    throw new Error('useMapExpand must be used inside MapExpandProvider');
  }
  return value;
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    backgroundColor: colors.surfaceMuted,
    boxShadow: shadows.raised,
  },
  media: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  stroke: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.media,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
