import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Xmark } from 'iconoir-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteFilterChips } from '@/components/discover/RouteFilterChips';
import { TravelTimeChip } from '@/components/discover/TravelTimeChip';
import { RouteCard } from '@/components/route/RouteCard';
import { Button } from '@/components/ui/Button';
import { useDiscoverState } from '@/features/discover/DiscoverStateProvider';
import { useReachableRoutes, useRecommendedList, withinReach } from '@/features/routes/queries';
import { filterRoutes } from '@/features/routes/routeFilter';
import type { Route, RouteFilter } from '@/features/routes/types';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatApproxDuration, formatDistance, formatDuration, formatSpeed } from '@/i18n/format';
import { matchesSearch } from '@/lib/searchText';
import { colors, fontFamily, layout, spacing, typography } from '@/theme';

const CLOSE_ICON_SIZE = 24;

/**
 * 05.03 Discover / Önerilen rotalar — Tümü (`rR0Ew`, scrolled `zZpLq`). The design's pinned
 * header (title, close and "Rotalarda ara") is the native Stack header with `Stack.SearchBar`;
 * the category chips under it and the search filter the list locally.
 *
 * `mode=reach` ("1 saatte ulaşabileceğin" → "Tümünü gör", `r7NfD9`): every route whose start is
 * within the chosen driving time, nearest first, with the "Başlangıca … içinde" chip and count.
 */
export default function RecommendedRoutesScreen() {
  const { t } = useTranslation(['discover', 'common', 'routes']);
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const reachMode = mode === 'reach';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RouteFilter>('all');
  const { city, origin, reachWindow } = useDiscoverState();
  const recommended = useRecommendedList();
  const reachable = useReachableRoutes(reachMode ? origin : null);
  const { isError, refetch } = reachMode ? reachable : recommended;
  // Without a known position (normally Home hides the section then) there is nothing to load.
  const isPending = reachMode ? origin !== null && reachable.isPending : recommended.isPending;
  const nothingInWindow = reachMode && withinReach(reachable.data, reachWindow).length === 0;
  const { isSaved, toggleBookmark } = useRouteBookmark();

  const routes = useMemo(() => {
    const reachMinutes = new Map<string, number>();
    let candidates: Route[];
    if (reachMode) {
      const inWindow = withinReach(reachable.data, reachWindow);
      inWindow.forEach(({ route, minutesToStart }) => reachMinutes.set(route.id, minutesToStart));
      candidates = inWindow.map(({ route }) => route);
    } else {
      candidates = recommended.data ?? [];
    }
    return filterRoutes(candidates, filter, city)
      .filter((route) => matchesSearch(route.name, query) || matchesSearch(route.summary, query))
      .map((route) => ({ route, minutesToStart: reachMinutes.get(route.id) }));
  }, [city, filter, query, reachMode, reachWindow, reachable.data, recommended.data]);

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
    empty = (
      <Text style={[styles.status, styles.statusText]}>
        {nothingInWindow ? t('reach.empty') : t('recommended.noMatches')}
      </Text>
    );
  }

  const chips = <RouteFilterChips value={filter} onChange={setFilter} />;
  const listHeader = reachMode ? (
    <View style={styles.filters}>
      <View style={styles.travelTimeRow}>
        <TravelTimeChip
          label={t(`reach.chip.${reachWindow}`)}
          accessibilityLabel={t('reach.chipA11y', { value: t(`reach.chip.${reachWindow}`) })}
          onPress={() => router.push('/discover/reach')}
        />
        {reachable.data ? (
          <Text style={styles.count}>{t('reach.routeCount', { count: routes.length })}</Text>
        ) : null}
      </View>
      {chips}
    </View>
  ) : (
    chips
  );

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
        keyExtractor={({ route }) => route.id}
        renderItem={({ item: { route, minutesToStart } }) => (
          <RouteCard
            variant="row"
            image={route.coverImage}
            title={route.name}
            subtitle={route.summary}
            travelTime={
              minutesToStart === undefined
                ? undefined
                : t('reach.toStart', { duration: formatDuration(minutesToStart) })
            }
            distance={formatDistance(route.distanceKm)}
            duration={formatApproxDuration(route.durationMinutes)}
            speed={reachMode ? formatSpeed(route.averageSpeedKmh) : undefined}
            badgeLabel={t(`routes:tags.${route.tag}`)}
            saved={isSaved(route.id)}
            onToggleSave={() => toggleBookmark(route.id)}
            onPress={() => router.push({ pathname: '/route/[id]', params: { id: route.id } })}
          />
        )}
        ItemSeparatorComponent={RowGap}
        ListHeaderComponent={listHeader}
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
  filters: {
    gap: spacing.lg,
  },
  travelTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  count: {
    ...typography.callout,
    color: colors.textSecondary,
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
