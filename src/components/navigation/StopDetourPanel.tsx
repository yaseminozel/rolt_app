import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InfoNote } from '@/components/feedback/InfoNote';
import { Button } from '@/components/ui/Button';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

type StopDetourPanelProps = {
  title: string;
  subtitle: string;
  /** "Sapma" / "Ek süre" boxes; `null` values while calculating. */
  metrics: { key: string; label: string; value: string | null }[];
  /** "Yeni toplam: 12,5 km · ~30 dk · varış 10:31", or a status line. */
  total: string;
  /** Detours over 3 km (note `wYzjk`). */
  warning?: string | null;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
  /** 06.02 "Haritadan seç" uses an 18 pt title, 06.03 a 20 pt one. */
  compactTitle?: boolean;
};

/**
 * Bottom panel of 06.03 "Durak önizleme" and 06.02 "Haritadan seç": place name and position on
 * the route, extra distance and time, the new total and the confirm button.
 */
export function StopDetourPanel({
  title,
  subtitle,
  metrics,
  total,
  warning,
  actionLabel,
  actionDisabled,
  onAction,
  compactTitle = false,
}: StopDetourPanelProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.handle} />
      <View style={styles.heading}>
        <Text style={[styles.title, compactTitle && styles.titleCompact]} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.key} style={styles.metric} accessible accessibilityLabel={`${metric.label}: ${metric.value ?? ''}`}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            {metric.value === null ? (
              <ActivityIndicator size="small" color={colors.textSecondary} style={styles.metricLoading} />
            ) : (
              <Text style={styles.metricValue}>{metric.value}</Text>
            )}
          </View>
        ))}
      </View>
      <Text style={styles.total}>{total}</Text>
      {warning ? <InfoNote text={warning} /> : null}
      <Button label={actionLabel} onPress={onAction} disabled={actionDisabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.bottomPanel,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  heading: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  titleCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  metricValue: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  metricLoading: {
    alignSelf: 'flex-start',
    height: 22,
  },
  total: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
