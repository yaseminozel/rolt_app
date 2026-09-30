import { MapPinXmark } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

type LocationPermissionBannerProps = {
  /** Region shown instead of the rider's surroundings, e.g. "Antalya". */
  city: string;
  onEnable: () => void;
};

const ICON_BADGE_SIZE = 36;
const ICON_SIZE = 18;
const ACTION_HEIGHT = 32;
/** Horizontal inset from the design (padding [12, 14]); off the 4 pt scale like `CautionNote`. */
const BANNER_INSET = 14;

/**
 * "Konum izni kapalı" banner on Discover Home (x3Pqz `Z778aa`): caution tone, map-pin-off
 * glyph on a white disc, copy and the "Aç" pill that asks for (or opens settings for) access.
 */
export function LocationPermissionBanner({ city, onEnable }: LocationPermissionBannerProps) {
  const { t } = useTranslation('discover');

  return (
    <View style={styles.banner}>
      <View style={styles.iconBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <MapPinXmark width={ICON_SIZE} height={ICON_SIZE} color={colors.cautionIcon} strokeWidth={1.5} />
      </View>
      <View style={styles.copy} accessible>
        <Text style={styles.title}>{t('permissionBanner.title')}</Text>
        <Text style={styles.description}>{t('permissionBanner.description', { city })}</Text>
      </View>
      <Pressable
        onPress={onEnable}
        accessibilityRole="button"
        accessibilityLabel={t('permissionBanner.actionA11y')}
        hitSlop={(layout.minTouchTarget - ACTION_HEIGHT) / 2}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <Text style={styles.actionLabel}>{t('permissionBanner.action')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: BANNER_INSET,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cautionBorder,
    backgroundColor: colors.cautionSurface,
  },
  iconBadge: {
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.calloutSemibold,
    color: colors.cautionText,
  },
  description: {
    ...typography.captionRelaxed,
    color: colors.cautionText,
  },
  action: {
    height: ACTION_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cautionIcon,
  },
  actionPressed: {
    backgroundColor: colors.cautionText,
  },
  actionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    color: colors.textInverse,
  },
});
