import { Group, Link, MoreHoriz } from 'iconoir-react-native';
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
  'community',
  'instagramStory',
  'instagramPost',
  'whatsapp',
  'copyLink',
  'other',
];

const neutralIcons = { community: Group, copyLink: Link, other: MoreHoriz } as const;
const isNeutral = (target: ShareTarget): target is keyof typeof neutralIcons => target in neutralIcons;

type ShareTargetsProps = {
  onShare: (target: ShareTarget) => void;
  /**
   * "Toplulukta paylaş" first, with the Topluluk tab's glyph on the neutral tile (not in the
   * design's row; added for the in-app share, decision 2026-10-09). Only for the rider's own
   * recorded rides.
   */
  withCommunity?: boolean;
};

/**
 * "Hemen paylaş" row (08.11 `f78naq`): (Toplulukta paylaş,) Instagram Hikaye, Instagram Gönderi,
 * WhatsApp, Bağlantı Kopyala, Diğer. App tiles are the design's exports (brand artwork, not
 * redrawn). With six targets the columns share the width.
 */
export function ShareTargets({ onShare, withCommunity = false }: ShareTargetsProps) {
  const { t } = useTranslation('rides');
  const targets = withCommunity ? TARGETS : TARGETS.filter((target) => target !== 'community');
  return (
    <View style={styles.row}>
      {targets.map((target) => (
        <Pressable
          key={target}
          onPress={() => onShare(target)}
          accessibilityRole="button"
          accessibilityLabel={t(`saved.targets.${target}`)}
          style={({ pressed }) => [
            styles.target,
            withCommunity && styles.targetShared,
            pressed && styles.pressed,
          ]}>
          {isNeutral(target) ? (
            <View style={styles.neutralTile}>
              <NeutralIcon target={target} />
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

function NeutralIcon({ target }: { target: keyof typeof neutralIcons }) {
  const Icon = neutralIcons[target];
  return <Icon width={28} height={28} color={colors.textPrimary} strokeWidth={1.5} />;
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
  targetShared: {
    flex: 1,
    width: undefined,
    maxWidth: 68,
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
