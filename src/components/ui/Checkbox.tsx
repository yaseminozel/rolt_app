import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { withHaptic } from '@/features/haptics/haptics';
import { colors, layout, radius, spacing, typography } from '@/theme';

export type CheckboxProps = {
  checked: boolean | 'indeterminate';
  onPress?: () => void;
  disabled?: boolean;
  error?: boolean;
  accessibilityLabel?: string;
  /** Text to the right of the control (design: "Select option"). */
  label?: string;
  /** 14 pt label for long acknowledgements (10.16 "Checkbox / Onay"); 16 by default. */
  compact?: boolean;
  /** Secondary line under the label (design: "Supporting text"). */
  helperText?: string;
  /** Outer layout only. */
  style?: StyleProp<ViewStyle>;
};

const CONTROL_SIZE = 24;
const FOCUS_RING_SIZE = 32;

/**
 * Checkbox — Pencil `QXn80` (Checkbox / Core Components), Mobile set:
 * 24 px control in a 48 px touch target; Unchecked / Checked / Indeterminate ×
 * Default, Pressed, Focus, Disabled, Error, Error pressed, Error focus.
 * The design's Hover rows look identical to Pressed and map to the pressed state;
 * Focus rows render only when the control receives keyboard/accessibility focus.
 */
export function Checkbox({
  checked,
  onPress,
  disabled = false,
  error = false,
  accessibilityLabel,
  label,
  compact = false,
  helperText,
  style,
}: CheckboxProps) {
  const [focused, setFocused] = useState(false);
  const selected = checked !== false;
  const accent = error ? colors.danger : colors.textPrimary;

  const controlStyle: ViewStyle = disabled
    ? {
        backgroundColor: selected ? colors.controlSelectedDisabled : colors.surfaceDisabled,
        borderColor: colors.surfaceDisabled,
      }
    : {
        backgroundColor: selected ? accent : colors.surface,
        borderColor: selected ? accent : error ? colors.danger : colors.controlBorder,
      };

  return (
    <Pressable
      onPress={withHaptic(onPress)}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={helperText}
      accessibilityState={{ checked: checked === 'indeterminate' ? 'mixed' : checked, disabled }}
      style={[styles.row, !onPress && styles.passThrough, style]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.target, pressed && !disabled && styles.targetPressed]}>
            <View style={[styles.control, controlStyle]}>
              {checked === 'indeterminate' ? (
                <Svg width={12} height={2} viewBox="0 0 12 2">
                  <Path d="M1 1H11" stroke={colors.textInverse} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              ) : checked ? (
                <Svg width={13} height={10} viewBox="0 0 13 10">
                  <Path
                    d="M1 5.5L4.5 9L12 1"
                    stroke={colors.textInverse}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              ) : null}
            </View>
            {focused && !disabled ? <View style={[styles.focusRing, { borderColor: accent }]} /> : null}
          </View>
          {label ? (
            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  compact && styles.labelCompact,
                  { color: disabled ? colors.textDisabled : colors.textPrimary },
                ]}>
                {label}
              </Text>
              {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Without onPress the control is display-only; let touches reach a pressable parent row.
  passThrough: {
    pointerEvents: 'none',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.touchTarget,
  },
  target: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  control: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRing: {
    position: 'absolute',
    top: (layout.touchTarget - FOCUS_RING_SIZE) / 2,
    left: (layout.touchTarget - FOCUS_RING_SIZE) / 2,
    width: FOCUS_RING_SIZE,
    height: FOCUS_RING_SIZE,
    borderRadius: radius.sm,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  labelCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    ...typography.bodyLarge,
  },
  helper: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
