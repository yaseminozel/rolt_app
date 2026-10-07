import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaMapCard } from '@/components/discover/AreaMapCard';
import { DiscoverHeader } from '@/components/discover/DiscoverHeader';
import { DiscoverHomeSkeleton } from '@/components/discover/DiscoverHomeSkeleton';
import { DiscoverSearchField } from '@/components/discover/DiscoverSearchField';
import { EmptySearchResults } from '@/components/discover/EmptySearchResults';
import { LocationOffCard } from '@/components/discover/LocationOffCard';
import { OfflineBanner } from '@/components/discover/OfflineBanner';
import { RecentSearches } from '@/components/discover/RecentSearches';
import { RecommendedRoutesSection } from '@/components/discover/RecommendedRoutesSection';
import { RouteFilterChips } from '@/components/discover/RouteFilterChips';
import { SearchResultsHeader } from '@/components/discover/SearchResultsHeader';
import { SearchSuggestions } from '@/components/discover/SearchSuggestions';
import { RouteCard } from '@/components/route/RouteCard';
import { Button } from '@/components/ui/Button';
import { cityAreaBounds } from '@/features/discover/cityArea';
import { useDiscoverState } from '@/features/discover/DiscoverStateProvider';
import { useDebouncedValue } from '@/features/discover/useDebouncedValue';
import {
  useRecommendedRoutes,
  useRouteSearch,
  useRoutesInArea,
  useSearchSuggestions,
} from '@/features/routes/queries';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { countActiveSearchFilters, EMPTY_ROUTE_SEARCH_FILTERS } from '@/features/routes/searchFilters';
import { useIsOffline } from '@/features/network/useIsOffline';
import type { Route } from '@/features/routes/types';
import { formatApproxDuration, formatDistance } from '@/i18n/format';
import { colors, layout, spacing, typography } from '@/theme';

/** Home (01.5) and the search states drawn on the same screen (01.1, 01.2, 01.3). */
type HomeMode = 'home' | 'recent' | 'suggestions' | 'results';

const SUGGESTION_DEBOUNCE_MS = 200;

/**
 * Discover Home — 05.01 "Ana sayfa" (`qrtOK` map-focused, `Jbnan` no location, `INwLr` offline,
 * `CImMS` loading) and the 05.02 search states on the same screen:
 * - focus the field → recent searches (`cv8lX`)
 * - type → suggestions
 * - submit → results (`pf9Iu`) or no results (`vxlt8`)
 * - "Vazgeç" (or Android back) → Home.
 *
 * One root `FlatList` (the scroll view must be the screen's first child for the native tab
 * bar): the header and the Home sections are its header, search results its rows. On iOS the
 * automatic content inset clears the status bar and the system-drawn tab bar.
 */
export default function DiscoverHomeScreen() {
  const { t } = useTranslation(['discover', 'routes']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const {
    city,
    citySource,
    locationPermission,
    enableLocation,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    sort,
    searchFilters,
    setSearchFilters,
    resetSearch,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useDiscoverState();
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const requireAccount = useRequireAccount();

  // Explore can't read the Discover stack's state, so the chosen region travels as a param.
  const openExplore = () => router.push({ pathname: '/explore', params: { city } });

  const [searchActive, setSearchActive] = useState(false);
  const [draft, setDraft] = useState('');

  const trimmedDraft = draft.trim();
  let mode: HomeMode = 'home';
  if (searchActive) {
    if (searchQuery !== '' && trimmedDraft === searchQuery) {
      mode = 'results';
    } else if (trimmedDraft !== '') {
      mode = 'suggestions';
    } else {
      mode = 'recent';
    }
  }

  const debouncedDraft = useDebouncedValue(trimmedDraft, SUGGESTION_DEBOUNCE_MS);
  const suggestions = useSearchSuggestions(mode === 'suggestions' ? debouncedDraft : '');
  const results = useRouteSearch(mode === 'results' ? searchQuery : '', sort, city, searchFilters);
  const recommended = useRecommendedRoutes(city, filter);
  const areaBounds = useMemo(() => cityAreaBounds(city), [city]);
  const area = useRoutesInArea(areaBounds, filter);
  const offline = useIsOffline();

  const locationGranted = locationPermission === Location.PermissionStatus.GRANTED;
  // No permission and no picked region: the region is unknown ("Konum belirlenmedi"), the map
  // card makes way for the permission card and the strip shows popular routes nationwide.
  const regionUnknown = citySource === 'default';
  const showLocationOffCard = regionUnknown && locationPermission !== null && !locationGranted;
  const homeLoading = recommended.isPending && area.isPending && !offline;

  const retryConnection = () => {
    recommended.refetch();
    area.refetch();
  };
  const activeFilterCount = countActiveSearchFilters(searchFilters);

  const submitSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setDraft(trimmed);
    setSearchQuery(trimmed);
    addRecentSearch(trimmed);
    setSearchActive(true);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const changeDraft = (text: string) => {
    setDraft(text);
    if (text.trim() === '') {
      setSearchQuery('');
    }
  };

  const clearSearch = () => {
    setDraft('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const cancelSearch = useCallback(() => {
    setDraft('');
    resetSearch();
    setSearchActive(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  }, [resetSearch]);

  // Android back leaves search before it leaves the tab.
  useFocusEffect(
    useCallback(() => {
      if (!searchActive) {
        return undefined;
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        cancelSearch();
        return true;
      });
      return () => subscription.remove();
    }, [searchActive, cancelSearch]),
  );

  const openRoute = (route: Route) => router.push({ pathname: '/route/[id]', params: { id: route.id } });

  const header = (
    <View style={styles.header}>
      <DiscoverHeader
        locationLabel={t('home.locationLabel')}
        locationValue={regionUnknown ? t('home.unknownLocation') : t('home.locationValue', { city })}
        onLocationPress={() => router.push('/discover/location')}
        onNotificationsPress={() => router.push('/notifications')}
      />

      {offline ? (
        <OfflineBanner
          title={t('home.offlineTitle')}
          retryLabel={t('home.retry')}
          onRetry={retryConnection}
        />
      ) : null}

      {mode === 'home' && homeLoading ? <DiscoverHomeSkeleton /> : null}

      <View style={[styles.searchRow, mode === 'home' && homeLoading && styles.hidden]}>
        <DiscoverSearchField
          ref={inputRef}
          value={draft}
          onChangeText={changeDraft}
          placeholder={t('search.placeholder')}
          onClear={clearSearch}
          onFocus={() => setSearchActive(true)}
          onSubmitEditing={() => submitSearch(draft)}
        />
        {searchActive ? (
          <Pressable
            onPress={cancelSearch}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelLabel}>{t('search.cancel')}</Text>
          </Pressable>
        ) : null}
      </View>

      {mode === 'home' && !homeLoading ? (
        <>
          {showLocationOffCard ? (
            <LocationOffCard
              title={t('home.locationOffTitle')}
              description={t('home.locationOffDescription')}
              actionLabel={t('home.locationOffAction')}
              onAction={enableLocation}
            />
          ) : (
            <AreaMapCard
              routeCount={area.data?.length}
              locationEnabled={locationGranted}
              onPress={openExplore}
              onLocatePress={locationGranted ? openExplore : enableLocation}
              offline={
                offline
                  ? { title: t('home.mapOfflineTitle'), description: t('home.mapOfflineDescription') }
                  : undefined
              }
            />
          )}
          <RecommendedRoutesSection
            title={regionUnknown ? t('home.popularTitle') : t('home.recommendedTitle')}
            filters={<RouteFilterChips value={filter} onChange={setFilter} />}
            emptyMessage={t('home.recommendedEmpty')}
            routes={recommended.data}
            isLoading={recommended.isPending}
            isError={recommended.isError}
            onRetry={() => recommended.refetch()}
            onSeeAll={offline ? undefined : () => router.push('/discover/recommended')}
            onRoutePress={openRoute}
            isSaved={isSaved}
            onToggleSave={toggleBookmark}
          />
        </>
      ) : null}

      {mode === 'recent' && recentSearches.length > 0 ? (
        <RecentSearches
          queries={recentSearches}
          onSelect={submitSearch}
          onRemove={removeRecentSearch}
          onClear={clearRecentSearches}
        />
      ) : null}

      {mode === 'suggestions' ? (
        <SearchSuggestions
          query={draft}
          routes={suggestions.data?.routes ?? []}
          places={suggestions.data?.places ?? []}
          onRoutePress={openRoute}
          onRouteFill={(route) => {
            setDraft(route.name);
            inputRef.current?.focus();
          }}
          onPlacePress={(place) => submitSearch(place.name)}
          onSeeAllResults={() => submitSearch(draft)}
        />
      ) : null}

      {mode === 'results' && (results.isPending || (results.data?.length ?? 0) > 0 || activeFilterCount > 0) ? (
        <SearchResultsHeader
          count={results.data?.length}
          sort={sort}
          activeFilterCount={activeFilterCount}
          onFilterPress={() => router.push('/discover/filter')}
          onSortPress={() => router.push('/discover/sort')}
        />
      ) : null}
    </View>
  );

  let emptyResults = null;
  if (mode === 'results') {
    if (results.isPending) {
      emptyResults = (
        <ActivityIndicator color={colors.textSecondary} accessibilityLabel={t('search.loading')} style={styles.status} />
      );
    } else if (results.isError) {
      emptyResults = (
        <View style={styles.status}>
          <Text style={styles.statusText}>{t('search.error')}</Text>
          <Button variant="text" label={t('home.retry')} onPress={() => results.refetch()} />
        </View>
      );
    } else if (activeFilterCount > 0) {
      emptyResults = (
        <View style={styles.empty}>
          <EmptySearchResults
            title={t('search.emptyTitle')}
            description={t('search.emptyFilteredDescription')}
            action={{ label: t('search.clearFilters'), onPress: () => setSearchFilters(EMPTY_ROUTE_SEARCH_FILTERS) }}
          />
        </View>
      );
    } else {
      emptyResults = (
        <View style={styles.empty}>
          <EmptySearchResults
            title={t('search.emptyTitle')}
            description={t('search.emptyDescription')}
            action={{ label: t('search.suggestRoute'), onPress: () => requireAccount('suggestRoute', () => router.push('/suggest-route')) }}
          />
        </View>
      );
    }
  }

  return (
    <FlatList
      data={mode === 'results' ? (results.data ?? []) : []}
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
          onPress={() => openRoute(item)}
        />
      )}
      ItemSeparatorComponent={RowGap}
      ListHeaderComponent={header}
      ListHeaderComponentStyle={styles.listHeader}
      ListEmptyComponent={emptyResults}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + spacing.lg },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    />
  );
}

function RowGap() {
  return <View style={styles.rowGap} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
  },
  listHeader: {
    marginBottom: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancel: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  cancelLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
  // The skeleton draws the search field's placeholder while Home loads.
  hidden: {
    display: 'none',
  },
  rowGap: {
    height: spacing.lg,
  },
  status: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.huge,
  },
  // Drops the empty state towards the middle of the free space, as in 01.3.
  empty: {
    paddingTop: spacing.huge,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
