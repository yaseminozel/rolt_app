import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

/**
 * - `filled`: Core Components radio (`UeboI`), 24 px filled control with a white dot.
 * - `outlined`: settings / bottom-sheet radio (`VGCwR` "Kontrol / Radyo"), 20 px ring with a dark dot.
 */
export type RadioButtonVariant = 'filled' | 'outlined';

export type RadioButtonProps = {
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  error?: boolean;
  accessibilityLabel?: string;
  variant?: RadioButtonVariant;
  /** Text to the right of the control (design: "Select option"). */
  label?: string;
  /** Secondary line under the label (design: "Supporting text"). */
  helperText?: string;
  /** Outer layout only. */
  style?: StyleProp<ViewStyle>;
};

const FILLED_SIZE = 24;
const OUTLINED_SIZE = 20;
const DOT_SIZE = 10;
const FOCUS_RING_SIZE = 32;

/**
 * Radio button — Pencil `UeboI` (Radio Button / Core Components, Mobile set) and
 * `VGCwR` (Kontrol / Radyo, used in settings rows and option sheets).
 * `filled`: Unchecked / Checked × Default, Pressed, Focus, Disabled, Error,
 * Error pressed, Error focus; Hover rows equal Pressed and map to it, Focus renders
 * only on keyboard/accessibility focus.
 * `outlined`: Empty / Selected only; it has no touch-target chrome, so it expands
 * its hit area with `hitSlop` and is usually placed inside a pressable row.
 */
export function RadioButton({
  selected,
  onPress,
  disabled = false,
  error = false,
  accessibilityLabel,
  variant = 'filled',
  label,
  helperText,
  style,
}: RadioButtonProps) {
  const [focused, setFocused] = useState(false);
  const outlined = variant === 'outlined';
  const accent = error ? colors.danger : colors.textPrimary;

  let controlStyle: ViewStyle;
  let dotColor: string;
  if (outlined) {
    // VGCwR defines only Empty and Selected; disabled/error reuse UeboI colors.
    const ring = disabled
      ? selected
        ? colors.controlSelectedDisabled
        : colors.surfaceDisabled
      : selected
        ? accent
        : error
          ? colors.danger
          : colors.controlTrack;
    controlStyle = { borderColor: ring };
    dotColor = ring;
  } else if (disabled) {
    controlStyle = {
      backgroundColor: selected ? colors.controlSelectedDisabled : colors.surfaceDisabled,
      borderColor: colors.surfaceDisabled,
    };
    dotColor = colors.surface;
  } else {
    controlStyle = {
      backgroundColor: selected ? accent : colors.surface,
      borderColor: selected ? accent : error ? colors.danger : colors.controlBorder,
    };
    dotColor = colors.surface;
  }

  const control = (
    <View style={[styles.control, outlined ? styles.controlOutlined : styles.controlFilled, controlStyle]}>
      {selected ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={helperText}
      accessibilityState={{ checked: selected, disabled }}
      hitSlop={outlined ? (layout.touchTarget - OUTLINED_SIZE) / 2 : undefined}
      style={[styles.row, !outlined && styles.rowFilled, !onPress && styles.passThrough, style]}
    >
      {({ pressed }) => (
        <>
          {outlined ? (
            control
          ) : (
            <View style={[styles.target, pressed && !disabled && styles.targetPressed]}>
              {control}
              {focused && !disabled ? (
                <View style={[styles.focusRing, { borderColor: accent }]} />
              ) : null}
            </View>
          )}
          {label ? (
            <View style={styles.content}>
              <Text style={[styles.label, { color: disabled ? colors.textDisabled : colors.textPrimary }]}>
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
  },
  rowFilled: {
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
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlFilled: {
    width: FILLED_SIZE,
    height: FILLED_SIZE,
  },
  controlOutlined: {
    width: OUTLINED_SIZE,
    height: OUTLINED_SIZE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.pill,
  },
  focusRing: {
    position: 'absolute',
    top: (layout.touchTarget - FOCUS_RING_SIZE) / 2,
    left: (layout.touchTarget - FOCUS_RING_SIZE) / 2,
    width: FOCUS_RING_SIZE,
    height: FOCUS_RING_SIZE,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...typography.bodyLarge,
  },
  helper: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
