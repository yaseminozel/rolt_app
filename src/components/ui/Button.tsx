import type { ComponentType } from 'react';
import {
  ActivityIndicator,
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
/** Color family. `destructive` is equivalent to the `destructive` boolean prop. */
export type ButtonTone = 'neutral' | 'brand' | 'destructive';
/** `md` = 44 pt (Core Components), `lg` = 48 pt (Get Started "Hemen başla", sLkVv). */
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = {
  /** Visible label. Omit it for the icon-only layout (then `accessibilityLabel` is required). */
  label?: string;
  onPress?: () => void;
  /** Design "Type": Contained (default) / Outlined / Text. */
  variant?: ButtonVariant;
  /** Design "State=Destructive" row: red tone for irreversible actions. Same as `tone="destructive"`. */
  destructive?: boolean;
  /** Color family; overrides `destructive` when set. `brand` = ROLT blue CTA (sLkVv). */
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  /**
   * Submitting state (TNFfZ): a spinner replaces the content while the button keeps
   * its size and colors; presses are ignored and `accessibilityState.busy` is set.
   */
  loading?: boolean;
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
const HEIGHT: Record<ButtonSize, number> = { md: 44, lg: 48 };

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
  // Design decision: the board has no pressed state for destructive contained; pressing
  // darkens to the destructive text red so touch feedback matches the neutral variant.
  contained: {
    background: colors.danger,
    pressedBackground: colors.dangerText,
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

// The design only draws the contained brand button; outlined/text follow the neutral pattern.
const brandTone: Record<ButtonVariant, Palette> = {
  contained: {
    background: colors.brand,
    pressedBackground: colors.brandPressed,
    foreground: colors.textInverse,
  },
  outlined: {
    background: colors.transparent,
    pressedBackground: colors.surfacePressed,
    border: colors.brand,
    foreground: colors.brand,
  },
  text: {
    background: colors.transparent,
    pressedBackground: colors.surfacePressed,
    foreground: colors.brand,
  },
};

const toneMap: Record<ButtonTone, Record<ButtonVariant, Palette>> = {
  neutral,
  brand: brandTone,
  destructive: destructiveTone,
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
 * Also the brand tone (Get Started, `sLkVv`) and the loading state (`TNFfZ`).
 * The design's Hover row is pointer-only and is not reachable on touch devices.
 */
export function Button({
  label,
  onPress,
  variant = 'contained',
  destructive = false,
  tone: toneProp,
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  trailingIcon: TrailingIcon,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const toneName: ButtonTone = toneProp ?? (destructive ? 'destructive' : 'neutral');
  const tone = disabled ? disabledTone[variant] : toneMap[toneName][variant];
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
      onPress={loading ? undefined : onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, busy: loading }}
      hitSlop={spacing.xxs}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size] },
        hasIconAndLabel && styles.withIcon,
        tone.border ? { borderColor: tone.border, borderWidth: 1 } : null,
        { backgroundColor: pressed ? tone.pressedBackground : tone.background },
        style,
      ]}
    >
      {/* Content stays mounted (invisible) while loading so the button keeps its width. */}
      <View style={[styles.content, loading && styles.hidden]}>
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
      </View>
      {loading ? (
        <View style={styles.spinner} pointerEvents="none">
          <ActivityIndicator size="small" color={tone.foreground} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  hidden: {
    opacity: 0,
  },
  spinner: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
