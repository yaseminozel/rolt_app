import { Check } from 'iconoir-react-native';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontFamily, spacing, typography } from '@/theme';

export type ProgressChecklistItemState = 'done' | 'active' | 'pending';

export type ProgressChecklistItem = {
  key: string;
  label: string;
  state: ProgressChecklistItemState;
  /** Trailing count on the row, e.g. "3 / 5" while photos upload. */
  count?: string;
  /** Spoken instead of `label` + `count`, e.g. "5 fotoğraftan 3 tanesi yüklendi". */
  accessibilityLabel?: string;
};

export type ProgressChecklistProps = {
  items: readonly ProgressChecklistItem[];
  style?: StyleProp<ViewStyle>;
};

const INDICATOR_SIZE = 24;
const GLYPH_SIZE = 14;

/**
 * Vertical list of steps of a long-running task (04.4 "Adımlar"): done steps get a green
 * check, the running step a spinner and bolder label (plus an optional count), pending steps
 * an empty ring and muted label. Copy comes from the caller, so the label can change with
 * the state ("yükleniyor" → "yüklendi").
 */
export function ProgressChecklist({ items, style }: ProgressChecklistProps) {
  return (
    <View style={[styles.list, style]}>
      {items.map((item) => (
        <View
          key={item.key}
          style={styles.row}
          accessible
          accessibilityRole="text"
          accessibilityLabel={item.accessibilityLabel ?? (item.count ? `${item.label}, ${item.count}` : item.label)}
          accessibilityState={{ busy: item.state === 'active' }}>
          <Indicator state={item.state} />
          <Text
            style={[
              styles.label,
              item.state === 'active' && styles.labelActive,
              item.state === 'pending' && styles.labelPending,
            ]}
            numberOfLines={2}>
            {item.label}
          </Text>
          {item.count ? <Text style={styles.count}>{item.count}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Indicator({ state }: { state: ProgressChecklistItemState }) {
  if (state === 'done') {
    return (
      <View style={[styles.indicator, styles.indicatorDone]}>
        <Check width={GLYPH_SIZE} height={GLYPH_SIZE} color={colors.textInverse} strokeWidth={2.4} />
      </View>
    );
  }
  if (state === 'active') {
    return (
      <View style={[styles.indicator, styles.indicatorActive]}>
        <ActivityIndicator size="small" color={colors.brand} style={styles.spinner} />
      </View>
    );
  }
  return <View style={[styles.indicator, styles.indicatorPending]} />;
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
  },
  indicator: {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDone: {
    backgroundColor: colors.success,
  },
  indicatorActive: {
    backgroundColor: colors.brandSubtle,
  },
  indicatorPending: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  // The native spinner is ~20 pt; the design's loader glyph is 14.
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  label: {
    flex: 1,
    ...typography.bodyMedium,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  labelActive: {
    fontFamily: fontFamily.semibold,
  },
  labelPending: {
    color: colors.textTertiary,
  },
  count: {
    ...typography.calloutSemibold,
    lineHeight: 16,
    color: colors.brand,
  },
});
