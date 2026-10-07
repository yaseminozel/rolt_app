import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { Route } from '@/features/routes/types';
import { formatDistance, formatDuration, formatNumber, formatSpeed } from '@/i18n/format';
import { colors, fontFamily, radius, spacing } from '@/theme';

const CELL_HEIGHT = 78;
/** Metric values: JetBrains Mono 16 (05.04 "Değer"). */
const VALUE_SIZE = 16;

type Metric = { key: string; value: string; label: string };

/**
 * "Sürüş metrikleri" (05.04 `d8jZLT`): two always-visible rows — distance, duration, average
 * speed, then max speed, bends and breaks. Values use the JetBrains Mono metric face (CLAUDE.md).
 */
export function RouteMetricsCard({ route }: { route: Route }) {
  const { t } = useTranslation('routeDetail');

  const rows: Metric[][] = [
    [
      { key: 'distance', value: formatDistance(route.distanceKm, 1), label: t('metrics.distance') },
      { key: 'duration', value: formatDuration(route.durationMinutes), label: t('metrics.duration') },
      { key: 'averageSpeed', value: formatSpeed(route.averageSpeedKmh), label: t('metrics.averageSpeed') },
    ],
    [
      { key: 'maxSpeed', value: formatSpeed(route.maxSpeedKmh), label: t('metrics.maxSpeed') },
      { key: 'curves', value: formatNumber(route.curveCount), label: t('metrics.curves') },
      { key: 'breaks', value: formatNumber(route.breakCount), label: t('metrics.breaks') },
    ],
  ];

  return (
    <View style={styles.card}>
      {rows.map((metrics, index) => (
        <View key={index} style={styles.row}>
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  value: {
    fontFamily: fontFamily.monoMedium,
    fontSize: VALUE_SIZE,
    lineHeight: 20,
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
});
