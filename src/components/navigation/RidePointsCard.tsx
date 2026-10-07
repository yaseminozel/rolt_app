import { ArrowSeparateVertical, MapPin, Xmark } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { RideStop } from '@/features/navigation/types';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

import { StopNumber } from './StopNumber';

const ROW_HEIGHT = 48;
/** Rows are 48 pt with a 1 pt divider between them. */
const ROW_PITCH = ROW_HEIGHT + 1;
const MARKER_SIZE = 20;

export type RidePointsCardProps = {
  /** First point: the rider's position ("Konumun", blue) or the route start (green). */
  start: { label: string; kind: 'device' | 'routeStart' };
  end: string;
  stops: RideStop[];
  /** Second line per stop, e.g. "+1 dk sapma" (or the doubling-back warning). */
  stopDetail: (stop: RideStop, index: number) => { text: string; warning?: boolean };
  onClose: () => void;
  /** ⇅ — only without stops, as in the design. */
  onSwap?: () => void;
  onRemoveStop: (stop: RideStop) => void;
  onMoveStop: (from: number, to: number) => void;
};

/**
 * "Map / Rota noktaları" (06.01 `i3tV8` / `QPiW4`, with stops `DEzDZ`): start, the rider's stops
 * (× removes, ≡ drags to reorder) and the finish, with close and ⇅ swap.
 */
export function RidePointsCard({
  start,
  end,
  stops,
  stopDetail,
  onClose,
  onSwap,
  onRemoveStop,
  onMoveStop,
}: RidePointsCardProps) {
  const { t } = useTranslation(['ride', 'common']);
  const [drag, setDrag] = useState<{ index: number; dy: number } | null>(null);

  const startMarker =
    start.kind === 'device' ? (
      <View style={styles.markerSlot}>
        <View style={styles.deviceHalo}>
          <View style={styles.deviceDot} />
        </View>
      </View>
    ) : (
      <View style={styles.markerSlot}>
        <View style={styles.startHalo}>
          <View style={styles.startDot} />
        </View>
      </View>
    );
  const endMarker = (
    <View style={styles.markerSlot}>
      <MapPin width={MARKER_SIZE} height={MARKER_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
    </View>
  );
  const closeButton = (
    <Pressable
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel={t('prepare.a11y.close')}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Xmark width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
    </Pressable>
  );

  if (stops.length === 0) {
    return (
      <View style={[styles.card, styles.compact]}>
        <View style={styles.markers}>
          {startMarker}
          <View style={styles.connector}>
            {[0, 1, 2].map((dot) => (
              <View key={dot} style={styles.connectorDot} />
            ))}
          </View>
          {endMarker}
        </View>
        <View style={styles.names}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, start.kind === 'device' && styles.deviceName]} numberOfLines={1}>
              {start.label}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {end}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          {closeButton}
          {onSwap ? (
            <Pressable
              onPress={onSwap}
              accessibilityRole="button"
              accessibilityLabel={t('prepare.a11y.swap')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <ArrowSeparateVertical width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.expanded]}>
      <View style={styles.row}>
        {startMarker}
        <Text style={[styles.name, styles.flex, start.kind === 'device' && styles.deviceName]} numberOfLines={1}>
          {start.label}
        </Text>
        {closeButton}
      </View>
      {stops.map((stop, index) => {
        const detail = stopDetail(stop, index);
        const offset = drag?.index === index ? drag.dy : 0;
        const pan = Gesture.Pan()
          .runOnJS(true)
          .activeOffsetY([-4, 4])
          .onUpdate((event) => setDrag({ index, dy: event.translationY }))
          .onEnd((event) => {
            const target = Math.max(0, Math.min(stops.length - 1, index + Math.round(event.translationY / ROW_PITCH)));
            setDrag(null);
            if (target !== index) {
              onMoveStop(index, target);
            }
          })
          .onFinalize(() => setDrag(null));
        return (
          <View
            key={stop.id}
            style={[styles.stopBlock, offset !== 0 && styles.dragging, { transform: [{ translateY: offset }] }]}>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.markerSlot}>
                <StopNumber number={index + 1} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {stop.name}
                </Text>
                <Text style={[styles.detail, detail.warning && styles.warning]} numberOfLines={1}>
                  {detail.text}
                </Text>
              </View>
              <Pressable
                onPress={() => onRemoveStop(stop)}
                accessibilityRole="button"
                accessibilityLabel={t('prepare.a11y.removeStop', { name: stop.name })}
                hitSlop={4}
                style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
                <Xmark width={18} height={18} color={colors.textPrimary} strokeWidth={1.5} />
              </Pressable>
              <GestureDetector gesture={pan}>
                <View
                  style={styles.smallButton}
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={t('prepare.a11y.reorderStop', { name: stop.name })}
                  accessibilityHint={t('prepare.a11y.reorderHint')}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                  onAccessibilityAction={({ nativeEvent }) => {
                    const target = nativeEvent.actionName === 'increment' ? index + 1 : index - 1;
                    if (target >= 0 && target < stops.length) {
                      onMoveStop(index, target);
                    }
                  }}>
                  <View style={styles.handle}>
                    {[0, 1, 2].map((bar) => (
                      <View key={bar} style={styles.handleBar} />
                    ))}
                  </View>
                </View>
              </GestureDetector>
            </View>
          </View>
        );
      })}
      <View style={styles.divider} />
      <View style={styles.row}>
        {endMarker}
        <Text style={[styles.name, styles.flex]} numberOfLines={1}>
          {end}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl - 4,
    backgroundColor: colors.surface,
    boxShadow: shadows.floatingPill,
  },
  compact: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
    paddingLeft: spacing.lg,
  },
  expanded: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
    paddingLeft: spacing.lg,
  },
  markers: {
    width: MARKER_SIZE,
    paddingTop: 14,
    paddingBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerSlot: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceHalo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandHalo,
  },
  deviceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  startHalo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  connector: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  connectorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.connectorDot,
  },
  names: {
    flex: 1,
  },
  nameRow: {
    height: 44,
    justifyContent: 'center',
  },
  actions: {
    gap: 1,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stopBlock: {
    backgroundColor: colors.surface,
  },
  dragging: {
    zIndex: 1,
    boxShadow: shadows.floatingPill,
  },
  flex: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  deviceName: {
    color: colors.brand,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  warning: {
    color: colors.cautionStrong,
  },
  divider: {
    height: 1,
    marginRight: spacing.md,
    backgroundColor: colors.border,
  },
  iconButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  smallButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  handle: {
    gap: spacing.xs,
  },
  handleBar: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textSecondary,
  },
});
