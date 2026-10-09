import { MapPin } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { MotorcycleBrandLogo, type MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { formatNumber } from '@/i18n/format';
import { colors, spacing, typography } from '@/theme';

import { ProfileAvatar } from './ProfileAvatar';

const AVATAR_SIZE = 52;
const META_ICON_SIZE = 16;

export type ProfileHeaderBike = {
  brand: MotorcycleBrand;
  /** e.g. "Yamaha MT-07 · 2022". */
  label: string;
};

type ProfileHeaderProps = {
  name: string;
  /** Username without "@". */
  handle: string;
  avatar?: ImageSourcePropType;
  /** Shown instead of a photo when there is none (own profile, 09.01 new rider). */
  avatarInitials?: string;
  bio?: string;
  /** Location line, e.g. "İstanbul, Türkiye". */
  city?: string;
  /** Main bike under the bio. */
  bike?: ProfileHeaderBike;
  followerCount: number;
  followingCount: number;
  /** Extra identity content under the counts, e.g. the match note on another rider's profile. */
  note?: ReactNode;
  /** Button row ("Takip et / Birlikte sür" or "Profili düzenle / Profili paylaş"). */
  actions?: ReactNode;
};

/**
 * Profile identity block shared by 01.8 (another rider, gKG8D) and 03.0 (own profile, Dimdp):
 * name, handle, avatar, bio, location and bike, follower counts, optional note and actions.
 */
export function ProfileHeader({
  name,
  handle,
  avatar,
  avatarInitials,
  bio,
  city,
  bike,
  followerCount,
  followingCount,
  note,
  actions,
}: ProfileHeaderProps) {
  const { t } = useTranslation('profile');
  const hasMeta = Boolean(city || bike);

  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <View style={styles.nameColumn}>
            {/* Both may be empty on an own profile whose registration steps were skipped. */}
            {name ? (
              <Text style={styles.name} accessibilityRole="header" numberOfLines={2}>
                {name}
              </Text>
            ) : null}
            {handle ? (
              <Text style={styles.handle} numberOfLines={1}>
                {t('handle', { handle })}
              </Text>
            ) : null}
          </View>
          <ProfileAvatar source={avatar} size={AVATAR_SIZE} initials={avatarInitials} />
        </View>

        {bio || hasMeta ? (
          <View style={styles.about}>
            {bio ? <Text style={styles.bio}>{bio}</Text> : null}
            {hasMeta ? (
              <View style={styles.metaRow}>
                {city ? (
                  <View style={styles.metaItem}>
                    <MapPin
                      width={META_ICON_SIZE}
                      height={META_ICON_SIZE}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {city}
                    </Text>
                  </View>
                ) : null}
                {bike ? (
                  <View style={styles.metaItem}>
                    <MotorcycleBrandLogo brand={bike.brand} size={META_ICON_SIZE} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {bike.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.stats}>
          <Text style={styles.statValue}>{formatNumber(followerCount)}</Text>
          {` ${t('stats.followers', { count: followerCount })}`}
          <Text style={styles.statValue}>{' · '}</Text>
          <Text style={styles.statValue}>{formatNumber(followingCount)}</Text>
          {` ${t('stats.following', { count: followingCount })}`}
        </Text>

        {note}
      </View>

      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  identity: {
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  nameColumn: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    ...typography.title,
    lineHeight: 30,
    color: colors.textPrimary,
  },
  handle: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
  },
  about: {
    gap: spacing.sm,
  },
  bio: {
    ...typography.bodyRelaxed,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  metaText: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  stats: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.bodySemibold,
    lineHeight: 20,
  },
});
