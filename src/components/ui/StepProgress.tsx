import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

/** `accent`: teal bars, 6 pt apart (route suggestion); `brand`: ROLT blue, 8 pt apart (registration 04.x). */
export type StepProgressTone = 'accent' | 'brand';

export type StepProgressProps = {
  /** Number of segments (the registration flow uses 3). */
  total: number;
  /** Filled segments, counting the current step (1 on step 1 … `total` when complete). */
  current: number;
  tone?: StepProgressTone;
  /** Defaults to `a11y.stepProgress` ("Adım {current} / {total}"). */
  accessibilityLabel?: string;
  /** Outer layout only (margins). */
  style?: StyleProp<ViewStyle>;
};

const SEGMENT_HEIGHT = 4;
const SEGMENT_RADIUS = 2;

const tones: Record<StepProgressTone, { filled: string; gap: number }> = {
  accent: { filled: colors.accentLight, gap: 6 },
  brand: { filled: colors.brand, gap: 8 },
};

/**
 * Segmented step indicator (registration "Progress / 1 / 3" in 04.01, route suggestion):
 * equal-width 4 pt bars, each either filled or empty (`border`) — no partial fill.
 */
export function StepProgress({
  total,
  current,
  tone = 'accent',
  accessibilityLabel,
  style,
}: StepProgressProps) {
  const { t } = useTranslation();
  const count = Math.max(1, Math.round(total));
  const filled = Math.min(Math.max(Math.round(current), 0), count);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? t('a11y.stepProgress', { current: filled, total: count })}
      accessibilityValue={{ min: 0, max: count, now: filled }}
      style={[styles.container, { gap: tones[tone].gap }, style]}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            { backgroundColor: index < filled ? tones[tone].filled : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    borderRadius: SEGMENT_RADIUS,
  },
});
