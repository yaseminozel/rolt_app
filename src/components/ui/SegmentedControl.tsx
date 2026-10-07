import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type SegmentedControlOption<T extends string | number> = {
  value: T;
  label: string;
};

type Option<T extends string | number> = SegmentedControlOption<T>;

export type SegmentedControlProps<T extends string | number> = {
  /** The design defines two or three segments. */
  options: readonly [Option<T>, Option<T>] | readonly [Option<T>, Option<T>, Option<T>];
  /** Value of the selected segment; one option is always selected. */
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /**
   * `standard` is the Core component; `pill` is the compact selector of Discover Home
   * (05.01 `m3ezc` "Süre seçici": 40 pt, fully rounded, dark selected segment, 13 pt labels).
   */
  variant?: 'standard' | 'pill';
};

/**
 * Segmented Control (Pencil `Q2D2c`) for switching between mutually exclusive views.
 * 52 pt tall with a 4 pt inset, 44 pt segments, 12 pt outer and 8 pt selected radius.
 * The design's Pressed state is visually identical to Enabled, so pressing has no extra styling.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
  variant = 'standard',
}: SegmentedControlProps<T>) {
  const pill = variant === 'pill';
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[styles.container, pill && styles.pillContainer]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            style={[
              styles.segment,
              pill && styles.pillSegment,
              selected && (pill ? styles.pillSegmentSelected : styles.segmentSelected),
            ]}
          >
            <Text
              numberOfLines={1}
              style={
                pill
                  ? [styles.pillLabel, selected && styles.pillLabelSelected]
                  : [styles.label, selected ? styles.labelSelected : disabled && styles.labelDisabled]
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 52,
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
  },
  labelSelected: {
    color: colors.textPrimary,
  },
  labelDisabled: {
    color: colors.textDisabled,
  },
  pillContainer: {
    height: 40,
    borderRadius: radius.pill,
  },
  pillSegment: {
    padding: 0,
    borderRadius: radius.pill,
  },
  pillSegmentSelected: {
    backgroundColor: colors.surfaceInverse,
  },
  pillLabel: {
    ...typography.calloutMedium,
    color: colors.textSecondary,
  },
  pillLabelSelected: {
    ...typography.calloutSemibold,
    color: colors.textInverse,
  },
});
