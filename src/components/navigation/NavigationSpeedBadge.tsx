import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatNumber, formatSpeed, unitLabels } from '@/i18n/format';
import { toDisplaySpeed } from '@/i18n/units';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

const SIZE = 52;

type NavigationSpeedBadgeProps = {
  /** Current GPS speed, m/s (`NavigationSnapshot.speedMps`). */
  speedMps: number;
  /** Without good GPS the speed isn't known: "—". */
  known: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Current speed over the navigation map (user request 2026-10-09; not in the design): a round
 * 52 pt badge like the map buttons, the value in JetBrains Mono like the other live metrics.
 */
export function NavigationSpeedBadge({ speedMps, known, style }: NavigationSpeedBadgeProps) {
  const { t } = useTranslation('ride');
  const kmh = speedMps * 3.6;
  const value = known
    ? formatNumber(Math.round(toDisplaySpeed(kmh)))
    : t('navigation.speedUnknown');
  return (
    <View
      style={[styles.badge, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        known ? t('navigation.speedA11y', { speed: formatSpeed(kmh) }) : t('navigation.speedUnknownA11y')
      }>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.unit} numberOfLines={1}>
        {unitLabels().speed}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapFab,
  },
  value: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 20,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  unit: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textSecondary,
  },
});
