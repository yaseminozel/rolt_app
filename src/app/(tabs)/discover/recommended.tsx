import { Stack, useRouter } from 'expo-router';
import { Xmark } from 'iconoir-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteFilterChips } from '@/components/discover/RouteFilterChips';
import { RouteCard } from '@/components/route/RouteCard';
import { Button } from '@/components/ui/Button';
import { useDiscoverState } from '@/features/discover/DiscoverStateProvider';
import { useRecommendedList } from '@/features/routes/queries';
import { filterRoutes } from '@/features/routes/routeFilter';
import type { RouteFilter } from '@/features/routes/types';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatApproxDuration, formatDistance } from '@/i18n/format';
import { matchesSearch } from '@/lib/searchText';
import { colors, fontFamily, layout, spacing, typography } from '@/theme';

const CLOSE_ICON_SIZE = 24;

/**
 * 05.03 Discover / Önerilen rotalar — Tümü (`rR0Ew`, scrolled `zZpLq`). The design's pinned
 * header (title, close and "Rotalarda ara") is the native Stack header with `Stack.SearchBar`;
 * the category chips under it and the search filter the list locally.
 */
export default function RecommendedRoutesScreen() {
  const { t } = useTranslation(['discover', 'common', 'routes']);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RouteFilter>('all');
  const { city } = useDiscoverState();
  const { data, isPending, isError, refetch } = useRecommendedList();
  const { isSaved, toggleBookmark } = useRouteBookmark();

  const routes = useMemo(
    () =>
      filterRoutes(data ?? [], filter, city).filter(
        (route) => matchesSearch(route.name, query) || matchesSearch(route.summary, query),
      ),
    [city, data, filter, query],
  );

  let empty = null;
  if (isPending) {
    empty = <ActivityIndicator color={colors.textSecondary} style={styles.status} />;
  } else if (isError) {
    empty = (
      <View style={styles.status}>
        <Text style={styles.statusText}>{t('home.loadError')}</Text>
        <Button variant="text" label={t('home.retry')} onPress={() => refetch()} />
      </View>
    );
  } else {
    empty = <Text style={[styles.status, styles.statusText]}>{t('recommended.noMatches')}</Text>;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('recommended.title'),
          headerTitleAlign: 'left',
          headerTitleStyle: { fontFamily: fontFamily.medium, fontSize: 18, color: colors.textPrimary },
          // The design closes this list with × instead of a back chevron; swipe back still works.
          headerBackVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common:actions.close')}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Xmark width={CLOSE_ICON_SIZE} height={CLOSE_ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
            </Pressable>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder={t('recommended.searchPlaceholder')}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        // Stacked under the title and always visible, like the design's sticky search; kept out
        // of the iOS 26 bottom toolbar so it never competes with the tab bar.
        placement="automatic"
        allowToolbarIntegration={false}
        hideWhenScrolling={false}
        autoCapitalize="none"
        tintColor={colors.textPrimary}
      />
      <FlatList
        data={routes}
        keyExtractor={(route) => route.id}
        renderItem={({ item }) => (
          <RouteCard
            variant="row"
            image={item.coverImage}
            title={item.name}
            subtitle={item.summary}
            distance={formatDistance(item.distanceKm)}
            duration={formatApproxDuration(item.durationMinutes)}
            badgeLabel={t(`routes:tags.${item.tag}`)}
            saved={isSaved(item.id)}
            onToggleSave={() => toggleBookmark(item.id)}
            onPress={() => router.push({ pathname: '/route/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={RowGap}
        ListHeaderComponent={<RouteFilterChips value={filter} onChange={setFilter} />}
        ListHeaderComponentStyle={styles.chips}
        ListEmptyComponent={empty}
        style={styles.list}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
    </>
  );
}

function RowGap() {
  return <View style={styles.rowGap} />;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  rowGap: {
    height: spacing.lg,
  },
  chips: {
    marginBottom: spacing.lg,
  },
  close: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  status: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.huge,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
