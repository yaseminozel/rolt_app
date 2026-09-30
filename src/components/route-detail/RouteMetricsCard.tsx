import { NavArrowDown, NavArrowUp } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Route } from '@/features/routes/types';
import { formatDistance, formatDuration, formatElevation, formatSpeed } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const CELL_HEIGHT = 78;
const TOGGLE_HEIGHT = 20;

type Metric = { key: string; value: string; label: string };

/**
 * "Sürüş metrikleri" (01.6 `q4T4o` expanded, `YeqzL` collapsed): distance, duration and
 * average speed; "Detay bilgileri göster" reveals max speed, elevation gain and descent.
 * Values use the JetBrains Mono metric style (CLAUDE.md).
 */
export function RouteMetricsCard({ route }: { route: Route }) {
  const { t } = useTranslation('routeDetail');
  const [expanded, setExpanded] = useState(false);

  const primary: Metric[] = [
    { key: 'distance', value: formatDistance(route.distanceKm, 1), label: t('metrics.distance') },
    { key: 'duration', value: formatDuration(route.durationMinutes), label: t('metrics.duration') },
    { key: 'averageSpeed', value: formatSpeed(route.averageSpeedKmh), label: t('metrics.averageSpeed') },
  ];
  const secondary: Metric[] = [
    { key: 'maxSpeed', value: formatSpeed(route.maxSpeedKmh), label: t('metrics.maxSpeed') },
    { key: 'elevationGain', value: formatElevation(route.elevationGainM), label: t('metrics.elevationGain') },
    { key: 'elevationLoss', value: formatElevation(route.elevationLossM), label: t('metrics.elevationLoss') },
  ];
  const ToggleIcon = expanded ? NavArrowUp : NavArrowDown;
  const toggleLabel = expanded ? t('moreDetails.hide') : t('moreDetails.show');

  return (
    <View style={styles.card}>
      <MetricRow metrics={primary} />
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        accessibilityState={{ expanded }}
        hitSlop={{ top: (layout.minTouchTarget - TOGGLE_HEIGHT) / 2, bottom: (layout.minTouchTarget - TOGGLE_HEIGHT) / 2 }}
        style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}>
        <Text style={styles.toggleLabel}>{toggleLabel}</Text>
        <ToggleIcon width={14} height={14} color={colors.textSecondary} strokeWidth={1.5} />
      </Pressable>
      {expanded ? <MetricRow metrics={secondary} style={styles.secondaryRow} /> : null}
    </View>
  );
}

function MetricRow({ metrics, style }: { metrics: Metric[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      {metrics.map((metric) => (
        <View
          key={metric.key}
          style={styles.cell}
          accessible
          accessibilityLabel={`${metric.label}: ${metric.value}`}>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {metric.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {metric.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryRow: {
    marginTop: spacing.sm,
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  value: {
    ...typography.metric,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  toggle: {
    height: TOGGLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  togglePressed: {
    backgroundColor: colors.surfaceMuted,
  },
  toggleLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
