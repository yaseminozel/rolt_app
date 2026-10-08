import { Image } from 'expo-image';
import { MapPin, Motorcycle, Search, Xmark } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import type { SearchResult } from '@/features/community/types';
import { formatDistance, formatDuration, formatNumber } from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const LEADING_SIZE = 40;

/** Splits `text` so the part matching `query` can be drawn bold (note `1005:39831`). */
function highlight(text: string, query?: string): ReactNode {
  if (!query) {
    return text;
  }
  const index = text.toLocaleLowerCase('tr').indexOf(query.toLocaleLowerCase('tr'));
  if (index < 0) {
    return text;
  }
  return (
    <>
      {text.slice(0, index)}
      <Text style={styles.match}>{text.slice(index, index + query.length)}</Text>
      {text.slice(index + query.length)}
    </>
  );
}

type SearchResultRowProps = {
  result: SearchResult;
  /** Bold the matching part (suggestions). */
  query?: string;
  onPress: () => void;
  /** Recent searches: × removes the row. */
  onRemove?: () => void;
  /** Rider rows in the results: "Takip et". */
  trailing?: ReactNode;
};

/**
 * One rider, ride or place in the community search (13.04): a leading avatar / thumbnail /
 * pin, the name, and a type line — the type is always written ("Sürücü", "Sürüş", "Konum"),
 * not left to the icon (note `1005:39831`).
 */
export function SearchResultRow({ result, query, onPress, onRemove, trailing }: SearchResultRowProps) {
  const { t } = useTranslation('community');

  let leading: ReactNode;
  let title: string;
  let subtitle: string;
  if (result.kind === 'rider') {
    leading = (
      <ProfileAvatar source={result.avatar} initials={initialsOf(result.name)} size={LEADING_SIZE} />
    );
    title = result.name;
    subtitle = trailing
      ? [t('handle', { handle: result.handle }), result.bike].filter(Boolean).join(' · ')
      : t('search.type.rider', { handle: result.handle });
  } else if (result.kind === 'ride') {
    leading = result.thumbnail ? (
      <Image source={result.thumbnail} contentFit="cover" style={styles.thumbnail} />
    ) : (
      <View style={styles.iconTile}>
        <Motorcycle width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
    );
    title = result.title;
    subtitle = trailing
      ? [result.authorName, formatDistance(result.distanceKm, 1), formatDuration(result.durationMinutes)].join(
          ' · ',
        )
      : t('search.type.ride', { name: result.authorName });
  } else {
    leading = (
      <View style={styles.iconTile}>
        <MapPin width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
    );
    title = result.name;
    subtitle = query
      ? t('search.type.placeWithCount', { count: result.rideCount, value: formatNumber(result.rideCount) })
      : t('search.type.place');
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {leading}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {highlight(title, query)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {trailing}
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('search.removeRecent')}
          style={styles.remove}>
          <Xmark width={18} height={18} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/** A recent plain query ("olimpos") with a search glyph. */
export function RecentQueryRow({
  query,
  onPress,
  onRemove,
}: {
  query: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('community');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={query}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconTile}>
        <Search width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {query}
        </Text>
        <Text style={styles.subtitle}>{t('search.type.query')}</Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('search.removeRecent')}
        style={styles.remove}>
        <Xmark width={18} height={18} color={colors.textSecondary} strokeWidth={1.5} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  thumbnail: {
    width: LEADING_SIZE,
    height: LEADING_SIZE,
    borderRadius: radius.sm,
  },
  iconTile: {
    width: LEADING_SIZE,
    height: LEADING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  match: {
    fontFamily: fontFamily.semibold,
  },
  subtitle: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
