import { CheckCircle, MapsArrowXmark, PathArrow } from 'iconoir-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

export type NavigationBannerTone = 'offRoute' | 'reconnected' | 'gps';

const tones = {
  offRoute: { surface: colors.dangerSurface, disc: colors.dangerText, Icon: PathArrow },
  reconnected: { surface: colors.successSurface, disc: colors.success, Icon: CheckCircle },
  gps: { surface: colors.cautionSurface, disc: colors.cautionStrong, Icon: MapsArrowXmark },
} as const;

const DISC_SIZE = 36;
const ICON_SIZE = 20;

type NavigationBannerProps = {
  tone: NavigationBannerTone;
  title: string;
  description: string;
  /** Spinner while the route is being rebuilt ("Rotadan çıktın"). */
  busy?: boolean;
};

/**
 * Status banner under the maneuver card (06.06): "Rotadan çıktın" (red, with spinner),
 * "Rotaya yeniden bağlandın" (green), "GPS sinyali zayıf / kayboldu" (orange).
 */
export function NavigationBanner({ tone, title, description, busy = false }: NavigationBannerProps) {
  const { surface, disc, Icon } = tones[tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: surface }, tone === 'offRoute' && styles.raised]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={[styles.disc, { backgroundColor: disc }]}>
        <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.textInverse} strokeWidth={1.8} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={colors.dangerText} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  // "Rotadan çıktın" floats like the maneuver card ("Banner" shadow 0 8 21).
  raised: {
    boxShadow: shadows.guidance,
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
