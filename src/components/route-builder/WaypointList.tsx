import { ArrowSeparateVertical, Plus, WarningCircle, Xmark } from 'iconoir-react-native';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/features/haptics/haptics';
import { placeShortLabel } from '@/features/route-suggestion/placeFormat';
import { MAX_STOPS, type Waypoint } from '@/features/route-suggestion/types';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

import { GripVerticalIcon } from './icons';
import { WaypointBadge } from './WaypointBadge';

export type WaypointListProps = {
  /** Start first, stops in order, end last (the provider's `draft.waypoints`). */
  waypoints: Waypoint[];
  /** Row drawn in the error state ("Yol bulunamadı": red tint + warning icon). */
  errorWaypointId?: string | null;
  /** Opens the search for that waypoint; rows are read-only without it. */
  onPressWaypoint?: (waypoint: Waypoint) => void;
  /** "⇅" on the start row. */
  onSwap?: () => void;
  onRemoveStop?: (waypointId: string) => void;
  /** Indices into `waypoints` (stops only: 1 … length − 2), like the provider's `moveStop`. */
  onMoveStop?: (fromIndex: number, toIndex: number) => void;
  /** "+ Ara durak ekle" row. */
  onAddStop?: () => void;
  /** Hides "Ara durak ekle" once reached (Directions takes 23 stops). */
  maxStops?: number;
  style?: StyleProp<ViewStyle>;
};

const ROW_HEIGHT = 56;
const SEPARATOR = 1;
/** Vertical distance between two stop rows (row + separator). */
const ROW_PITCH = ROW_HEIGHT + SEPARATOR;
const ICON_SIZE = 18;
const SWAP_SIZE = 36;
const ADD_ICON_SIZE = 14;
/** The lifted stop grows slightly so it reads as picked up. */
const LIFT_SCALE = 1.02;

/**
 * The stop card of 04.1 (`r3Pix` "Duraklar"): start, stops, "Ara durak ekle" and end rows, each
 * with its label and place (or a placeholder while empty). The swap button and "Ara durak ekle"
 * appear once both ends are chosen. Stops reorder by dragging their grip (reanimated + gesture
 * handler); screen readers get "Yukarı taşı / Aşağı taşı" actions on the same grip.
 */
export function WaypointList({
  waypoints,
  errorWaypointId,
  onPressWaypoint,
  onSwap,
  onRemoveStop,
  onMoveStop,
  onAddStop,
  maxStops = MAX_STOPS,
  style,
}: WaypointListProps) {
  const { t } = useTranslation('routeSuggestion');
  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const stops = waypoints.slice(1, -1);
  const endsChosen = Boolean(start?.place && end?.place);

  // Drag state shared by the stop rows: which stop is lifted, where it hovers, how far it moved.
  const dragFrom = useSharedValue(-1);
  const dragTo = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const pendingReset = useRef(false);

  // Drop the lifted row only once the reordered list is on screen, so it doesn't jump back first.
  useLayoutEffect(() => {
    if (pendingReset.current) {
      pendingReset.current = false;
      dragFrom.set(-1);
      dragTo.set(-1);
      dragY.set(0);
    }
  }, [waypoints, dragFrom, dragTo, dragY]);

  const commitMove = (from: number, to: number) => {
    if (from === to || !onMoveStop) {
      dragFrom.set(-1);
      dragTo.set(-1);
      dragY.set(0);
      return;
    }
    pendingReset.current = true;
    onMoveStop(from + 1, to + 1);
  };

  if (!start || !end) {
    return <View style={[styles.card, style]} />;
  }

  return (
    <View style={[styles.card, style]}>
      <WaypointRow
        waypoint={start}
        error={start.id === errorWaypointId}
        onPress={onPressWaypoint}
        trailing={
          onSwap && endsChosen ? (
            <Pressable
              onPress={onSwap}
              accessibilityRole="button"
              accessibilityLabel={t('waypoints.swap')}
              hitSlop={(layout.minTouchTarget - SWAP_SIZE) / 2}
              style={({ pressed }) => [styles.swap, pressed && styles.swapPressed]}>
              <ArrowSeparateVertical width={16} height={16} color={colors.textPrimary} strokeWidth={1.8} />
            </Pressable>
          ) : null
        }
      />
      {stops.map((stop, position) => (
        <View key={stop.id}>
          <Separator />
          <DraggableStop
            position={position}
            dragFrom={dragFrom}
            dragTo={dragTo}
            dragY={dragY}
            reorderable={Boolean(onMoveStop) && stops.length > 1}>
            <WaypointRow
              waypoint={stop}
              error={stop.id === errorWaypointId}
              onPress={onPressWaypoint}
              trailing={
                <>
                  {stop.id === errorWaypointId ? <ErrorIcon /> : null}
                  {onMoveStop && stops.length > 1 ? (
                    <StopGrip
                      name={stop.place ? placeShortLabel(stop.place) : t('waypoints.stop')}
                      position={position}
                      count={stops.length}
                      dragFrom={dragFrom}
                      dragTo={dragTo}
                      dragY={dragY}
                      onCommit={commitMove}
                    />
                  ) : null}
                  {onRemoveStop ? (
                    <Pressable
                      onPress={() => onRemoveStop(stop.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('waypoints.remove', {
                        name: stop.place ? placeShortLabel(stop.place) : t('waypoints.stop'),
                      })}
                      hitSlop={(layout.minTouchTarget - ICON_SIZE) / 2}
                      style={({ pressed }) => pressed && styles.iconPressed}>
                      <Xmark width={ICON_SIZE} height={ICON_SIZE} color={colors.textSecondary} strokeWidth={1.8} />
                    </Pressable>
                  ) : null}
                </>
              }
            />
          </DraggableStop>
        </View>
      ))}
      {onAddStop && endsChosen && stops.length < maxStops ? (
        <>
          <Separator />
          <Pressable
            onPress={onAddStop}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <View style={styles.addMark}>
              <Plus width={ADD_ICON_SIZE} height={ADD_ICON_SIZE} color={colors.brand} strokeWidth={2} />
            </View>
            <Text style={styles.addLabel}>{t('waypoints.addStop')}</Text>
          </Pressable>
        </>
      ) : null}
      <Separator />
      <WaypointRow
        waypoint={end}
        error={end.id === errorWaypointId}
        onPress={onPressWaypoint}
        trailing={end.id === errorWaypointId ? <ErrorIcon /> : null}
      />
    </View>
  );
}

type WaypointRowProps = {
  waypoint: Waypoint;
  error: boolean;
  onPress?: (waypoint: Waypoint) => void;
  trailing?: ReactNode;
};

function WaypointRow({ waypoint, error, onPress, trailing }: WaypointRowProps) {
  const { t } = useTranslation('routeSuggestion');
  const label = t(`waypoints.${waypoint.kind}`);
  const value = waypoint.place ? placeShortLabel(waypoint.place) : null;
  const placeholder = t(`waypoints.${waypoint.kind}Placeholder`);

  return (
    <View style={[styles.row, error && styles.rowError]}>
      <Pressable
        onPress={onPress ? () => onPress(waypoint) : undefined}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={t('waypoints.rowA11y', { label, value: value ?? placeholder })}
        accessibilityHint={error ? t('waypoints.error') : undefined}
        style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}>
        <WaypointBadge kind={waypoint.kind} filled={waypoint.place !== null} />
        <View style={styles.text}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value ?? placeholder}
          </Text>
        </View>
      </Pressable>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

function ErrorIcon() {
  const { t } = useTranslation('routeSuggestion');
  return (
    <WarningCircle
      width={ICON_SIZE}
      height={ICON_SIZE}
      color={colors.dangerText}
      strokeWidth={1.8}
      accessibilityLabel={t('waypoints.error')}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

type DragProps = {
  position: number;
  count: number;
  dragFrom: SharedValue<number>;
  dragTo: SharedValue<number>;
  dragY: SharedValue<number>;
  onCommit: (from: number, to: number) => void;
};

/** Lifts the row being dragged and slides the rows it passes by one pitch. */
function DraggableStop({
  children,
  position,
  dragFrom,
  dragTo,
  dragY,
  reorderable,
}: Omit<DragProps, 'count' | 'onCommit'> & { children: ReactNode; reorderable: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    const from = dragFrom.get();
    if (from < 0) {
      return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0 };
    }
    if (from === position) {
      return { transform: [{ translateY: dragY.get() }, { scale: LIFT_SCALE }], zIndex: 2 };
    }
    const to = dragTo.get();
    const shift = from < position && position <= to ? -ROW_PITCH : to <= position && position < from ? ROW_PITCH : 0;
    return { transform: [{ translateY: withTiming(shift, { duration: 150 }) }, { scale: 1 }], zIndex: 0 };
  });

  if (!reorderable) {
    return <>{children}</>;
  }
  return <Animated.View style={[styles.draggable, animatedStyle]}>{children}</Animated.View>;
}

function StopGrip({ name, position, count, dragFrom, dragTo, dragY, onCommit }: DragProps & { name: string }) {
  const { t } = useTranslation('routeSuggestion');

  const pan = Gesture.Pan()
    // Grab on the first movement so the surrounding scroll view doesn't take the gesture.
    .minDistance(0)
    .hitSlop({ top: 13, bottom: 13, left: 13, right: 6 })
    .onStart(() => {
      dragFrom.set(position);
      dragTo.set(position);
      dragY.set(0);
      scheduleOnRN(haptics.press);
    })
    .onUpdate((event) => {
      const y = Math.min(Math.max(event.translationY, -position * ROW_PITCH), (count - 1 - position) * ROW_PITCH);
      dragY.set(y);
      const to = Math.min(Math.max(position + Math.round(y / ROW_PITCH), 0), count - 1);
      if (to !== dragTo.get()) {
        // Each new slot is a tick, like a detent.
        scheduleOnRN(haptics.select);
      }
      dragTo.set(to);
    })
    .onEnd(() => {
      const to = dragTo.get();
      dragY.set((to - position) * ROW_PITCH);
      if (to !== position) {
        scheduleOnRN(haptics.tap);
      }
      scheduleOnRN(onCommit, position, to);
    })
    .onFinalize((_event, success) => {
      if (!success) {
        dragFrom.set(-1);
        dragTo.set(-1);
        dragY.set(0);
      }
    });

  const actions = [
    ...(position > 0 ? [{ name: 'moveUp', label: t('waypoints.moveUp') }] : []),
    ...(position < count - 1 ? [{ name: 'moveDown', label: t('waypoints.moveDown') }] : []),
  ];

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('waypoints.reorder', { name })}
        accessibilityHint={t('waypoints.reorderHint')}
        accessibilityActions={actions}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'moveUp' && position > 0) {
            onCommit(position, position - 1);
          } else if (nativeEvent.actionName === 'moveDown' && position < count - 1) {
            onCommit(position, position + 1);
          }
        }}>
        <GripVerticalIcon width={ICON_SIZE} height={ICON_SIZE} color={colors.textTertiary} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    // Square row fills (error tint, lifted stop) stay inside the rounded outline.
    overflow: 'hidden',
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  rowError: {
    backgroundColor: colors.dangerSubtle,
  },
  rowMain: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  draggable: {
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 13,
    color: colors.textTertiary,
  },
  value: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textTertiary,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  swap: {
    width: SWAP_SIZE,
    height: SWAP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  swapPressed: {
    backgroundColor: colors.surfacePressed,
  },
  iconPressed: {
    opacity: 0.5,
  },
  addMark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  addLabel: {
    ...typography.bodySemibold,
    color: colors.brand,
  },
  separator: {
    height: SEPARATOR,
    marginLeft: 50,
    backgroundColor: colors.borderSubtle,
  },
});
