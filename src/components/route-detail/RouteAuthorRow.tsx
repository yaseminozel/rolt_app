import { Image } from 'expo-image';
import { User } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RouteAuthor } from '@/features/routes/types';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

const AVATAR_SIZE = 40;

type RouteAuthorRowProps = {
  author: RouteAuthor;
  /** ISO date the route was published. */
  publishedAt: string;
  onPress?: () => void;
};

/** "12 Eyl 2026" / "12 Sept 2026", day-first in both languages. */
function formatPublishedDate(iso: string, language: string) {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/** "Profile Media" (01.6 `NNKS2`): avatar, author name and publish date; opens the rider profile. */
export function RouteAuthorRow({ author, publishedAt, onPress }: RouteAuthorRowProps) {
  const { t, i18n } = useTranslation('routeDetail');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={t('a11y.authorProfile', { name: author.name })}
      hitSlop={{ top: 2, bottom: 2 }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        {author.avatar ? (
          <Image source={author.avatar} contentFit="cover" style={styles.avatarImage} />
        ) : (
          <User width={20} height={20} color={colors.textSecondary} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {author.name}
        </Text>
        <Text style={styles.date}>{formatPublishedDate(publishedAt, i18n.language)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceMuted,
    boxShadow: shadows.raised,
  },
  avatarImage: {
    width: AVATAR_SIZE - 3,
    height: AVATAR_SIZE - 3,
    borderRadius: radius.pill,
  },
  copy: {
    gap: spacing.xxs,
    flexShrink: 1,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  date: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textTertiary,
  },
});
