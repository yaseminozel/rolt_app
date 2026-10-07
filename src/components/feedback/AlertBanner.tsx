import { WarningCircle } from 'iconoir-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type AlertBannerProps = {
  title: string;
  message: string;
};

const ICON_SIZE = 16;
const ICON_STROKE = 1.2;
/** Title / message line height (14 pt at 1.43). */
const LINE_HEIGHT = 20;

/**
 * Inline danger banner with a title and an explanation, e.g. the sign-in lockout on
 * 02.02 "Şifre — Hata · Çok fazla deneme" (Pencil `rjPx3` "Banner"). Not dismissible:
 * the design's close icon is disabled.
 */
export function AlertBanner({ title, message }: AlertBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <View
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <WarningCircle
          width={ICON_SIZE}
          height={ICON_SIZE}
          color={colors.dangerBannerIcon}
          strokeWidth={ICON_STROKE}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBannerBorder,
    backgroundColor: colors.dangerBannerSurface,
  },
  // Centers the 16 pt glyph on the first 20 pt text line.
  icon: {
    paddingVertical: spacing.xxs,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyMedium,
    lineHeight: LINE_HEIGHT,
    color: colors.dangerBannerText,
  },
  message: {
    ...typography.body,
    lineHeight: LINE_HEIGHT,
    color: colors.dangerBannerText,
  },
});
