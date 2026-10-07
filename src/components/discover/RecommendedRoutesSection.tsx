import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteCard } from '@/components/route/RouteCard';
import { Button } from '@/components/ui/Button';
import type { Route } from '@/features/routes/types';
import { formatDistance, formatDuration } from '@/i18n/format';
import { colors, layout, spacing, typography } from '@/theme';

type RecommendedRoutesSectionProps = {
  /** Section heading, e.g. "Önerilen rotalar" or "Türkiye'de popüler rotalar". */
  title: string;
  /** Row between the title and the strip (the category chips on Home, 05.01 `uNyfD`). */
  filters?: ReactNode;
  /** Shown when the strip loaded but has no routes. */
  emptyMessage: string;
  routes: Route[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** "Tümünü gör"; hidden when omitted (offline). */
  onSeeAll?: () => void;
  onRoutePress: (route: Route) => void;
  isSaved: (routeId: string) => boolean;
  onToggleSave: (routeId: string) => void;
};

/** Compact card height (150 × 191, `gBNKs`); loading and empty states keep it so nothing jumps. */
const STRIP_HEIGHT = 191;

/**
 * Home route section (05.01 `uNyfD`): title with "Tümünü gör", optional category chips and a
 * horizontal strip of compact route cards bleeding to the screen edges.
 */
export function RecommendedRoutesSection({
  title,
  filters,
  emptyMessage,
  routes,
  isLoading,
  isError,
  onRetry,
  onSeeAll,
  onRoutePress,
  isSaved,
  onToggleSave,
}: RecommendedRoutesSectionProps) {
  const { t } = useTranslation(['discover', 'routes']);

  let body;
  if (routes && routes.length > 0) {
    body = (
      <FlatList
        horizontal
        data={routes}
        keyExtractor={(route) => route.id}
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
        renderItem={({ item }) => (
          <RouteCard
            variant="compact"
            image={item.coverImage}
            title={item.name}
            subtitle={item.summary}
            distance={formatDistance(item.distanceKm)}
            duration={formatDuration(item.durationMinutes)}
            badgeLabel={t(`routes:tags.${item.tag}`)}
            saved={isSaved(item.id)}
            onToggleSave={() => onToggleSave(item.id)}
            onPress={() => onRoutePress(item)}
          />
        )}
      />
    );
  } else if (isLoading) {
    body = (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.placeholder}>
        <Text style={styles.message}>{t('home.loadError')}</Text>
        <Button variant="text" label={t('home.retry')} onPress={onRetry} />
      </View>
    );
  } else {
    body = (
      <View style={styles.placeholder}>
        <Text style={styles.message}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="link"
            hitSlop={{ top: spacing.md, bottom: spacing.md, left: spacing.sm, right: spacing.sm }}
            style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
          </Pressable>
        ) : null}
      </View>
      {filters}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.headline,
    lineHeight: 22,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  seeAll: {
    ...typography.bodyMedium,
    color: colors.brand,
  },
  pressed: {
    opacity: 0.6,
  },
  strip: {
    marginHorizontal: -layout.screenGutter,
    // Room for the card image shadow, which a horizontal list would otherwise clip.
    marginVertical: -spacing.sm,
  },
  stripContent: {
    gap: spacing.md,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.sm,
  },
  placeholder: {
    height: STRIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
