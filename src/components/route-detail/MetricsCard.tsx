import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/theme';

const CELL_HEIGHT = 78;
/** Metric values: JetBrains Mono 16 (05.04 / 09.06 "Değer"). */
const VALUE_SIZE = 16;

export type MetricItem = { key: string; value: string; label: string };

/**
 * Bordered card of metric rows, three per row (05.04 / 09.06 "Sürüş metrikleri", 08.11
 * "Sürüş özeti"). Values use the JetBrains Mono metric face (CLAUDE.md).
 */
export function MetricsCard({ rows }: { rows: MetricItem[][] }) {
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
