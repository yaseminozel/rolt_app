import { Link, MoreHoriz } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShareTarget } from '@/features/rides/shareRide';
import { colors, fontFamily, radius, spacing } from '@/theme';

const TILE = 56;
const icons = {
  instagram: require('../../../assets/images/share/instagram.png'),
  whatsapp: require('../../../assets/images/share/whatsapp.png'),
};

const TARGETS: readonly ShareTarget[] = [
  'instagramStory',
  'instagramPost',
  'whatsapp',
  'copyLink',
  'other',
];

/**
 * "Hemen paylaş" row (08.11 `f78naq`): Instagram Hikaye, Instagram Gönderi, WhatsApp,
 * Bağlantı Kopyala, Diğer. App tiles are the design's exports (brand artwork, not redrawn).
 */
export function ShareTargets({ onShare }: { onShare: (target: ShareTarget) => void }) {
  const { t } = useTranslation('rides');
  return (
    <View style={styles.row}>
      {TARGETS.map((target) => (
        <Pressable
          key={target}
          onPress={() => onShare(target)}
          accessibilityRole="button"
          accessibilityLabel={t(`saved.targets.${target}`)}
          style={({ pressed }) => [styles.target, pressed && styles.pressed]}>
          {target === 'copyLink' || target === 'other' ? (
            <View style={styles.neutralTile}>
              {target === 'copyLink' ? (
                <Link width={28} height={28} color={colors.textPrimary} strokeWidth={1.5} />
              ) : (
                <MoreHoriz width={28} height={28} color={colors.textPrimary} strokeWidth={1.5} />
              )}
            </View>
          ) : (
            <Image
              source={target === 'whatsapp' ? icons.whatsapp : icons.instagram}
              style={styles.tile}
            />
          )}
          <Text style={styles.label} numberOfLines={2}>
            {t(`saved.targets.${target}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  target: {
    width: 68,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: TILE / 2,
  },
  neutralTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
