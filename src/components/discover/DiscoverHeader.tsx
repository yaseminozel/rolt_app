import { Bell, NavArrowDown } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

type DiscoverHeaderProps = {
  /** "Konumun:" or "Seçili bölge:". */
  locationLabel: string;
  /** "Antalya, Türkiye" or "Antalya (varsayılan)". */
  locationValue: string;
  onLocationPress: () => void;
  onNotificationsPress: () => void;
};

/** Design wordmark metrics: 28 pt Bakbak One at 1.1428 line height, 2 % tracking. */
const WORDMARK_LINE_HEIGHT = 32;
const WORDMARK_TRACKING = 0.56;
const CHEVRON_SIZE = 16;
const BELL_SIZE = 20;

/**
 * "Marka ve konum" block of Discover Home (p4CIJi `hgFbz`, x3Pqz `m0pR6A`): ROLT wordmark,
 * the current region (opens the region sheet) and the notifications button.
 */
export function DiscoverHeader({
  locationLabel,
  locationValue,
  onLocationPress,
  onNotificationsPress,
}: DiscoverHeaderProps) {
  const { t } = useTranslation(['discover', 'auth']);

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark} accessibilityRole="header">
        {t('auth:wordmark')}
      </Text>
      <View style={styles.locationRow}>
        <Pressable
          onPress={onLocationPress}
          accessibilityRole="button"
          accessibilityLabel={`${locationLabel} ${locationValue}`}
          accessibilityHint={t('home.changeLocationA11y')}
          style={({ pressed }) => [styles.location, pressed && styles.pressed]}>
          <Text style={styles.locationLabel}>{locationLabel}</Text>
          <View style={styles.locationValueRow}>
            <Text style={styles.locationValue} numberOfLines={1}>
              {locationValue}
            </Text>
            <NavArrowDown width={CHEVRON_SIZE} height={CHEVRON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
        </Pressable>
        <Pressable
          onPress={onNotificationsPress}
          accessibilityRole="button"
          accessibilityLabel={t('home.notificationsA11y')}
          style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}>
          <Bell width={BELL_SIZE} height={BELL_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  wordmark: {
    ...typography.wordmark,
    lineHeight: WORDMARK_LINE_HEIGHT,
    letterSpacing: WORDMARK_TRACKING,
    color: colors.brand,
    alignSelf: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchTarget,
  },
  location: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.xxs,
    minHeight: layout.minTouchTarget,
  },
  pressed: {
    opacity: 0.6,
  },
  locationLabel: {
    ...typography.body,
    color: colors.textTertiary,
  },
  locationValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationValue: {
    ...typography.bodyMedium,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  bell: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  bellPressed: {
    backgroundColor: colors.surfacePressed,
  },
});
