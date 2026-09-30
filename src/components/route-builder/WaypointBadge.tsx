import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { WaypointKind } from '@/features/route-suggestion/types';
import { colors, fontFamily, radius, shadows } from '@/theme';

/**
 * - `list`: stop card rows (04.1 `D8XrfG` "İşaret", 24 pt).
 * - `field`: search field lead (04.1 `xySut`, 22 pt).
 * - `card`: markers on the route preview card (24 pt, white ring, shadow; stops 14 pt).
 * - `map`: markers on the full-screen edit map (04.1 `JgPGO`, 32 pt; stops 22 pt).
 * - `pin`: head of the centre pin on "Haritadan seç" (04.1 `t7X6H`, 36 pt).
 */
export type WaypointBadgeSize = 'list' | 'field' | 'card' | 'map' | 'pin';

type Spec = {
  size: number;
  fontSize: number;
  /** White ring around lettered markers drawn over maps. */
  ring: number;
  /** Hollow stop circle: diameter and outline. */
  stopSize: number;
  stopStroke: number;
  shadow?: string;
};

const SPECS: Record<WaypointBadgeSize, Spec> = {
  list: { size: 24, fontSize: 11, ring: 0, stopSize: 24, stopStroke: 2 },
  field: { size: 22, fontSize: 10, ring: 0, stopSize: 22, stopStroke: 2 },
  card: { size: 24, fontSize: 11, ring: 2, stopSize: 14, stopStroke: 2, shadow: shadows.mapMarker },
  map: { size: 32, fontSize: 12, ring: 3, stopSize: 22, stopStroke: 4, shadow: shadows.mapMarker },
  pin: { size: 36, fontSize: 14, ring: 3, stopSize: 36, stopStroke: 3, shadow: shadows.mapPin },
};

/** Start is green, end is the primary ink (design "Pin / A", "Pin / B"). */
export const waypointTint = (kind: WaypointKind) => (kind === 'start' ? colors.success : colors.textPrimary);

export type WaypointBadgeProps = {
  kind: WaypointKind;
  size?: WaypointBadgeSize;
  /**
   * Filled once the waypoint has a place; hollow (white with a coloured outline and letter) while
   * it is still empty (04.1 "— Boş" `XrNal`). Stops are always hollow circles.
   */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A / B / stop marker shared by the stop list, the search field, the preview card and the maps.
 * Decorative: rows and markers carry the accessible label.
 */
export function WaypointBadge({ kind, size = 'list', filled = true, style }: WaypointBadgeProps) {
  const { t } = useTranslation('routeSuggestion');
  const spec = SPECS[size];

  if (kind === 'stop') {
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.circle,
          {
            width: spec.stopSize,
            height: spec.stopSize,
            borderWidth: spec.stopStroke,
            borderColor: size === 'map' || size === 'pin' ? colors.textBody : colors.controlBorder,
            backgroundColor: colors.surface,
            boxShadow: spec.shadow,
          },
          style,
        ]}
      />
    );
  }

  const tint = waypointTint(kind);
  const hollow = !filled && spec.ring === 0;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        {
          width: spec.size,
          height: spec.size,
          backgroundColor: hollow ? colors.surface : tint,
          borderWidth: hollow ? 2 : spec.ring,
          borderColor: hollow ? tint : colors.surface,
          boxShadow: spec.shadow,
        },
        style,
      ]}>
      <Text style={[styles.letter, { fontSize: spec.fontSize, color: hollow ? tint : colors.textInverse }]}>
        {kind === 'start' ? t('waypoints.startLetter') : t('waypoints.endLetter')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  letter: {
    fontFamily: fontFamily.bold,
    includeFontPadding: false,
  },
});
