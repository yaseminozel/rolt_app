import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

export type StepProgressProps = {
  /** Number of segments (the registration flow uses 4). */
  total: number;
  /** Filled segments, counting the current step (1 on step 1 … `total` when complete). */
  current: number;
  /** Defaults to `a11y.stepProgress` ("Adım {current} / {total}"). */
  accessibilityLabel?: string;
  /** Outer layout only (margins). */
  style?: StyleProp<ViewStyle>;
};

const SEGMENT_HEIGHT = 4;
const SEGMENT_GAP = 6;
const SEGMENT_RADIUS = 2;

/**
 * Segmented step indicator at the top of the registration flow ("Adım göstergesi" in
 * UZpFX, QKDo5, g4Zy4, Fv4ol, LreVd): equal-width 4 pt bars, 6 pt apart, each either
 * filled (`accentLight`) or empty (`border`) — no partial fill.
 */
export function StepProgress({ total, current, accessibilityLabel, style }: StepProgressProps) {
  const { t } = useTranslation();
  const count = Math.max(1, Math.round(total));
  const filled = Math.min(Math.max(Math.round(current), 0), count);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? t('a11y.stepProgress', { current: filled, total: count })}
      accessibilityValue={{ min: 0, max: count, now: filled }}
      style={[styles.container, style]}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            { backgroundColor: index < filled ? colors.accentLight : colors.border },
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
    gap: SEGMENT_GAP,
  },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    borderRadius: SEGMENT_RADIUS,
  },
});
