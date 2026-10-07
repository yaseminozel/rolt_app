import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatNumber, formatRideClock, unitLabels } from '@/i18n/format';
import { toDisplayDistance, toDisplaySpeed } from '@/i18n/units';
import { colors, fontFamily, spacing, typography } from '@/theme';

type RecordMetricsProps = {
  distanceM: number;
  durationS: number;
  averageSpeedMps: number;
  /** `row`: the sheet (08.01–08.03); `stacked`: "Tam ekran" (08.02 `CYh2I`) with large values. */
  layout?: 'row' | 'stacked';
  /** Before "Başlat" the zero values are muted (08.01). */
  muted?: boolean;
};

/** Mesafe (km) · Süre · Ort. hız (km/sa) of the recording, in JetBrains Mono so digits don't jitter. */
export function RecordMetrics({
  distanceM,
  durationS,
  averageSpeedMps,
  layout = 'row',
  muted = false,
}: RecordMetricsProps) {
  const { t } = useTranslation('rides');
  const units = unitLabels();
  const metrics = [
    {
      key: 'distance',
      value: formatNumber(toDisplayDistance(distanceM / 1000), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      label: t('record.metrics.distance', { unit: units.distance }),
    },
    { key: 'duration', value: formatRideClock(durationS), label: t('record.metrics.duration') },
    {
      key: 'speed',
      value: formatNumber(toDisplaySpeed(averageSpeedMps * 3.6), { maximumFractionDigits: 0 }),
      label: t('record.metrics.averageSpeed', { unit: units.speed }),
    },
  ];
  const stacked = layout === 'stacked';

  return (
    <View style={stacked ? styles.stacked : styles.row}>
      {metrics.map((metric) => (
        <View
          key={metric.key}
          style={stacked ? styles.stackedMetric : styles.metric}
          accessible
          accessibilityLabel={`${metric.label} ${metric.value}`}>
          <Text
            style={[stacked ? styles.stackedValue : styles.value, muted && styles.muted]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {metric.value}
          </Text>
          <Text style={stacked ? styles.stackedLabel : styles.label} numberOfLines={1}>
            {metric.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  value: {
    ...typography.metricLarge,
    lineHeight: 30,
    color: colors.textPrimary,
  },
  muted: {
    color: colors.textTertiary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  stacked: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  stackedMetric: {
    alignItems: 'center',
    gap: 6,
  },
  stackedValue: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 48,
    lineHeight: 58,
    color: colors.textPrimary,
  },
  stackedLabel: {
    ...typography.headlineMedium,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
});
