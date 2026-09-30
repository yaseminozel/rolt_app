import {
  BookmarkSolid,
  CheckCircle,
  InfoCircle,
  WarningTriangle,
  XmarkCircleSolid,
} from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, radius, spacing, typography } from '@/theme';

export type BadgeTone = 'neutral' | 'warning' | 'info' | 'success' | 'destructive';
export type BadgeSize = 'small' | 'large';

type BadgeBaseProps = {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Overrides the tone's default icon. */
  icon?: ComponentType<SvgProps>;
};

type BadgeLabelProps = BadgeBaseProps & {
  label: string;
  /** `false` renders a text-only tag. */
  showIcon?: boolean;
  accessibilityLabel?: string;
};

type BadgeIconOnlyProps = BadgeBaseProps & {
  label?: undefined;
  showIcon?: never;
  /** Required because an icon-only badge has no visible text. */
  accessibilityLabel: string;
};

export type BadgeProps = BadgeLabelProps | BadgeIconOnlyProps;

type ToneStyle = {
  icon: ComponentType<SvgProps>;
  background: string;
  labelColor: string;
  iconColor: string;
};

const TONES: Record<BadgeTone, ToneStyle> = {
  neutral: {
    icon: BookmarkSolid,
    background: colors.surfaceMuted,
    labelColor: colors.textSecondary,
    iconColor: colors.textSecondary,
  },
  // Warning, Info and Success icons are drawn in the primary ink in the design, not the tone color.
  warning: {
    icon: WarningTriangle,
    background: colors.warningSurface,
    labelColor: colors.warning,
    iconColor: colors.textPrimary,
  },
  info: {
    icon: InfoCircle,
    background: colors.infoSurface,
    labelColor: colors.info,
    iconColor: colors.textPrimary,
  },
  success: {
    icon: CheckCircle,
    background: colors.successSurface,
    labelColor: colors.success,
    iconColor: colors.textPrimary,
  },
  destructive: {
    icon: XmarkCircleSolid,
    background: colors.dangerSurface,
    labelColor: colors.dangerText,
    iconColor: colors.dangerText,
  },
};

const ICON_SIZE: Record<BadgeSize, { label: number; iconOnly: number }> = {
  small: { label: 14, iconOnly: 14 },
  large: { label: 20, iconOnly: 16 },
};

/**
 * Badge / Tag (Pencil `YFU4m`): non-interactive status indicator, Small 24 pt / Large 32 pt tall.
 * Omit `label` for the icon-only variant. If made interactive, wrap it in a 44 pt touch target.
 */
export function Badge({
  tone = 'neutral',
  size = 'small',
  icon,
  label,
  showIcon = true,
  accessibilityLabel,
}: BadgeProps) {
  const toneStyle = TONES[tone];
  const Icon = icon ?? toneStyle.icon;
  const iconOnly = label === undefined;
  const iconSize = iconOnly ? ICON_SIZE[size].iconOnly : ICON_SIZE[size].label;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        size === 'small' ? styles.small : styles.large,
        iconOnly && (size === 'small' ? styles.smallIconOnly : styles.largeIconOnly),
        { backgroundColor: toneStyle.background },
      ]}
    >
      {iconOnly || showIcon ? (
        <Icon width={iconSize} height={iconSize} color={toneStyle.iconColor} />
      ) : null}
      {iconOnly ? null : (
        <Text
          numberOfLines={1}
          style={[
            size === 'small' ? styles.labelSmall : styles.labelLarge,
            { color: toneStyle.labelColor },
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  small: {
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  large: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
  },
  smallIconOnly: {
    width: 24,
    paddingHorizontal: 0,
  },
  largeIconOnly: {
    width: 32,
    paddingHorizontal: 0,
  },
  labelSmall: {
    ...typography.captionMedium,
    lineHeight: 16,
  },
  labelLarge: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
});
