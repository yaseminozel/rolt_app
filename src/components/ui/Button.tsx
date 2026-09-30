import type { ComponentType } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, radius, spacing, typography } from '@/theme';

export type ButtonVariant = 'contained' | 'outlined' | 'text';

export type ButtonProps = {
  /** Visible label. Omit it for the icon-only layout (then `accessibilityLabel` is required). */
  label?: string;
  onPress?: () => void;
  /** Design "Type": Contained (default) / Outlined / Text. */
  variant?: ButtonVariant;
  /** Design "State=Destructive" row: red tone for irreversible actions. */
  destructive?: boolean;
  disabled?: boolean;
  /** Leading icon, e.g. an `iconoir-react-native` icon. Rendered at 20 px. */
  icon?: ComponentType<SvgProps>;
  /** Trailing icon slot ("Right icon" in the design's Default section). */
  trailingIcon?: ComponentType<SvgProps>;
  accessibilityLabel?: string;
  /** Outer layout only (margins, alignSelf, flex); visuals come from the variant. */
  style?: StyleProp<ViewStyle>;
};

const ICON_SIZE = 20;
const ICON_STROKE = 1.5;
/** Width of the icon-only content box (design: "Action" 48 × 44). */
const ICON_ONLY_CONTENT_WIDTH = 48;

type Palette = { background: string; pressedBackground: string; border?: string; foreground: string };

const neutral: Record<ButtonVariant, Palette> = {
  contained: {
    background: colors.surfaceInverse,
    pressedBackground: colors.surfaceInverseActive,
    foreground: colors.textInverse,
  },
  outlined: {
    background: colors.transparent,
    pressedBackground: colors.surfacePressed,
    border: colors.border,
    foreground: colors.textPrimary,
  },
  text: {
    background: colors.transparent,
    pressedBackground: colors.surfacePressed,
    foreground: colors.textPrimary,
  },
};

const destructiveTone: Record<ButtonVariant, Palette> = {
  // The design has no pressed state for destructive contained; keep the fill.
  contained: {
    background: colors.danger,
    pressedBackground: colors.danger,
    foreground: colors.textInverse,
  },
  outlined: {
    background: colors.transparent,
    pressedBackground: colors.surfacePressed,
    border: colors.danger,
    foreground: colors.dangerText,
  },
  text: {
    background: colors.transparent,
    pressedBackground: colors.surfacePressed,
    foreground: colors.dangerText,
  },
};

const disabledTone: Record<ButtonVariant, Palette> = {
  contained: {
    background: colors.surfaceDisabled,
    pressedBackground: colors.surfaceDisabled,
    foreground: colors.textDisabled,
  },
  outlined: {
    background: colors.transparent,
    pressedBackground: colors.transparent,
    border: colors.border,
    foreground: colors.textDisabled,
  },
  text: {
    background: colors.transparent,
    pressedBackground: colors.transparent,
    foreground: colors.textDisabled,
  },
};

/**
 * Button — Pencil `RC60W` (Buttons / Core Components).
 * Types Contained / Outlined / Text × states Enabled, Disabled, Pressed and the
 * Destructive tone; layouts Default (label), With icon and Icon only.
 * The design's Hover row is pointer-only and is not reachable on touch devices.
 */
export function Button({
  label,
  onPress,
  variant = 'contained',
  destructive = false,
  disabled = false,
  icon: Icon,
  trailingIcon: TrailingIcon,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const tone = disabled ? disabledTone[variant] : destructive ? destructiveTone[variant] : neutral[variant];
  const iconOnly = !label && !!(Icon ?? TrailingIcon);
  const hasIconAndLabel = !!label && !!(Icon ?? TrailingIcon);

  const renderIcon = (IconComponent: ComponentType<SvgProps> | undefined) =>
    IconComponent ? (
      <IconComponent
        width={ICON_SIZE}
        height={ICON_SIZE}
        color={tone.foreground}
        strokeWidth={ICON_STROKE}
      />
    ) : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={spacing.xxs}
      style={({ pressed }) => [
        styles.base,
        hasIconAndLabel && styles.withIcon,
        tone.border ? { borderColor: tone.border, borderWidth: 1 } : null,
        { backgroundColor: pressed ? tone.pressedBackground : tone.background },
        style,
      ]}
    >
      {iconOnly ? (
        <View style={styles.iconOnlyContent}>{renderIcon(Icon ?? TrailingIcon)}</View>
      ) : (
        <>
          {renderIcon(Icon)}
          {label ? (
            <Text style={[styles.label, { color: tone.foreground }]} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
          {renderIcon(TrailingIcon)}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  // "With icon": the icon + label group carries an extra 8 px inset on each side.
  withIcon: {
    paddingHorizontal: spacing.xxl + spacing.sm,
  },
  iconOnlyContent: {
    width: ICON_ONLY_CONTENT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyMedium,
  },
});
