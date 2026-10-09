import { Image } from 'expo-image';
import { MapPin, PathArrow, Search, User, Xmark } from 'iconoir-react-native';
import type { ComponentType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import type { SearchResult } from '@/features/community/types';
import { formatCompactDuration, formatDistance, formatNumber } from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { avatarTone, colors, fontFamily, radius, spacing } from '@/theme';

const KIND_ICONS: Record<SearchResult['kind'], ComponentType<SvgProps>> = {
  rider: User,
  ride: PathArrow,
  place: MapPin,
};

/**
 * Where the row is shown (13.04, Pencil `cLyek`, `h3sJ5`, `vDoEo`): `recent` rows use a type
 * tile and a ×; `suggestion` rows show the rider's avatar or the ride's map; `result` rows are
 * 44 pt with "Takip et" on riders and the ride's distance and time.
 */
export type SearchRowMode = 'recent' | 'suggestion' | 'result';

function Tile({ icon: Icon, size = 40 }: { icon: ComponentType<SvgProps>; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      <Icon width={22} height={22} color={colors.textPrimary} strokeWidth={1.5} />
    </View>
  );
}

type SearchResultRowProps = {
  result: SearchResult;
  mode: SearchRowMode;
  onPress: () => void;
  onRemove?: () => void;
  /** Result rows of riders: following state and its toggle. */
  following?: boolean;
  onFollowPress?: () => void;
};

/** A rider, ride or place in the community search; the type is always written out. */
export function SearchResultRow({
  result,
  mode,
  onPress,
  onRemove,
  following,
  onFollowPress,
}: SearchResultRowProps) {
  const { t } = useTranslation('community');
  const size = mode === 'result' ? 44 : 40;

  let leading: ReactNode;
  let title: string;
  let subtitle: string;
  if (result.kind === 'rider') {
    leading =
      mode === 'recent' ? (
        <Tile icon={User} />
      ) : (
        <ProfileAvatar
          source={result.avatar}
          initials={initialsOf(result.name)}
          tone={avatarTone(result.id)}
          size={size}
        />
      );
    title = result.name;
    subtitle =
      mode === 'result'
        ? [t('handle', { handle: result.handle }), result.bike].filter(Boolean).join(' · ')
        : t('search.type.rider', { handle: result.handle });
  } else if (result.kind === 'ride') {
    leading =
      mode !== 'recent' && result.thumbnail ? (
        <Image
          source={result.thumbnail}
          contentFit="cover"
          style={[styles.thumbnail, { width: size, height: size }]}
        />
      ) : (
        <Tile icon={KIND_ICONS.ride} size={size} />
      );
    title = result.title;
    subtitle =
      mode === 'result'
        ? [
            result.authorName,
            formatDistance(result.distanceKm, 1),
            formatCompactDuration(result.durationMinutes),
          ].join(' · ')
        : t('search.type.ride', { name: result.authorName });
  } else {
    leading = <Tile icon={MapPin} size={size} />;
    title = result.name;
    subtitle =
      mode === 'recent'
        ? t('search.type.place')
        : t('search.type.placeWithCount', {
            count: result.rideCount,
            value: formatNumber(result.rideCount),
          });
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [styles.row, mode !== 'result' && styles.rowPadded, pressed && styles.pressed]}>
      {leading}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, mode === 'result' && styles.subtitleLarge]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {onFollowPress ? (
        <Pressable
          onPress={onFollowPress}
          accessibilityRole="button"
          accessibilityState={{ selected: following }}
          style={({ pressed }) => [
            styles.follow,
            following && styles.followActive,
            pressed && styles.followPressed,
          ]}>
          <Text style={[styles.followLabel, following && styles.followLabelActive]}>
            {following ? t('search.following') : t('search.follow')}
          </Text>
        </Pressable>
      ) : null}
      {onRemove ? <RemoveButton onPress={onRemove} /> : null}
    </Pressable>
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('community');
  return (
    <Pressable
      onPress={onPress}
      hitSlop={13}
      accessibilityRole="button"
      accessibilityLabel={t('search.removeRecent')}
      style={styles.remove}>
      <Xmark width={18} height={18} color={colors.textPrimary} strokeWidth={1.5} />
    </Pressable>
  );
}

/** A typed query in "Son aramalar" ("olimpos") or the "tüm sonuçları gör" row. */
export function QueryRow({
  title,
  subtitle,
  onPress,
  onRemove,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, styles.rowPadded, pressed && styles.pressed]}>
      <Tile icon={Search} />
      <View style={styles.copy}>
        <Text style={[styles.title, !subtitle && styles.titleRegular]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onRemove ? <RemoveButton onPress={onRemove} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowPadded: {
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.tile,
  },
  thumbnail: {
    borderRadius: radius.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  titleRegular: {
    fontFamily: fontFamily.regular,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSubtle,
  },
  subtitleLarge: {
    fontSize: 14,
  },
  follow: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: colors.textPrimary,
  },
  followActive: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  followPressed: {
    opacity: 0.85,
  },
  followLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textInverse,
  },
  followLabelActive: {
    color: colors.textPrimary,
  },
  remove: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
