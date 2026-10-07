import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { findCityByName } from '@/features/location/turkishCities';
import { EMPTY_ROUTE_SEARCH_FILTERS } from '@/features/routes/searchFilters';
import type {
  LngLat,
  ReachWindow,
  RouteFilter,
  RouteSearchFilters,
  RouteSort,
} from '@/features/routes/types';
import { normalizeForSearch } from '@/lib/searchText';

import { nearestCityName } from './cityArea';
import { useForegroundLocationPermission } from './useForegroundLocationPermission';

/** Region shown before the device location is known (the design's "Antalya"). */
export const DEFAULT_DISCOVER_CITY = 'Antalya';
const MAX_RECENT_SEARCHES = 8;
/** ~100 m: GPS jitter must not refetch the driving times. */
const ORIGIN_PRECISION = 1000;

const roundOrigin = ([lng, lat]: LngLat): LngLat => [
  Math.round(lng * ORIGIN_PRECISION) / ORIGIN_PRECISION,
  Math.round(lat * ORIGIN_PRECISION) / ORIGIN_PRECISION,
];

/**
 * Where the Home region comes from; decides the header label (CLAUDE.md "Tasarım kararları"):
 * - `device`: permission granted, nearest province → "Konumun: İzmir, Türkiye"
 * - `manual`: picked in the region sheet → "Seçili bölge: İzmir, Türkiye"
 * - `default`: nothing known yet → "Seçili bölge: Antalya (varsayılan)"
 */
export type DiscoverCitySource = 'default' | 'device' | 'manual';

type DiscoverState = {
  city: string;
  citySource: DiscoverCitySource;
  /** Region sheet choice; wins over the device location until the app restarts. */
  selectCity: (city: string) => void;
  /** Foreground location permission; `null` while it is being read. */
  locationPermission: Location.PermissionStatus | null;
  enableLocation: () => Promise<void>;
  /**
   * Where "1 saatte ulaşabileceğin" measures from: the device position, or the picked region's
   * centre (the same place "Konumun:" names); `null` while the region is unknown.
   */
  origin: LngLat | null;
  /** "Süre seçici" on Home and the "Başlangıca … içinde" chip on the full list share it. */
  reachWindow: ReachWindow;
  setReachWindow: (window: ReachWindow) => void;

  /** Home category chips. */
  filter: RouteFilter;
  setFilter: (filter: RouteFilter) => void;

  /** Submitted search ("adrasan"); empty while not searching or still typing the first query. */
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sort: RouteSort;
  setSort: (sort: RouteSort) => void;
  searchFilters: RouteSearchFilters;
  setSearchFilters: (filters: RouteSearchFilters) => void;
  /** Leaves search: clears the query and the filter sheet choices (sort is kept as a preference). */
  resetSearch: () => void;

  /** Most recent first, at most 8, in memory only. */
  recentSearches: readonly string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
};

const DiscoverStateContext = createContext<DiscoverState | null>(null);

/**
 * Discover tab state shared by Home (01.1–01.5) and its sheets (sort, filter, region).
 * Mounted in `(tabs)/discover/_layout.tsx`, so it lives as long as the tab.
 */
export function DiscoverStateProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState<{ city: string; source: DiscoverCitySource }>({
    city: DEFAULT_DISCOVER_CITY,
    source: 'default',
  });
  const [devicePosition, setDevicePosition] = useState<LngLat | null>(null);
  const [reachWindow, setReachWindow] = useState<ReachWindow>(60);
  const [filter, setFilter] = useState<RouteFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<RouteSort>('recommended');
  const [searchFilters, setSearchFilters] = useState<RouteSearchFilters>(EMPTY_ROUTE_SEARCH_FILTERS);
  const [recentSearches, setRecentSearches] = useState<readonly string[]>([]);
  const { status: locationPermission, enable: enableLocation } = useForegroundLocationPermission();

  const manualRegion = region.source === 'manual';
  const permissionGranted = locationPermission === Location.PermissionStatus.GRANTED;

  // With permission, follow the device's province unless the rider picked one.
  useEffect(() => {
    if (!permissionGranted || manualRegion) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const position =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
        const coordinates: LngLat = [position.coords.longitude, position.coords.latitude];
        const city = nearestCityName(coordinates);
        if (!cancelled) {
          setDevicePosition(roundOrigin(coordinates));
          setRegion((current) => (current.source === 'manual' ? current : { city, source: 'device' }));
        }
      } catch {
        // Position unavailable (e.g. location services off): keep the current region.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permissionGranted, manualRegion]);

  const origin = useMemo<LngLat | null>(() => {
    if (region.source === 'device') {
      return devicePosition;
    }
    if (region.source === 'manual') {
      const match = findCityByName(region.city);
      return match ? [match.longitude, match.latitude] : null;
    }
    return null;
  }, [region, devicePosition]);

  const selectCity = useCallback((city: string) => setRegion({ city, source: 'manual' }), []);

  const resetSearch = useCallback(() => {
    setSearchQuery('');
    setSearchFilters(EMPTY_ROUTE_SEARCH_FILTERS);
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const key = normalizeForSearch(trimmed);
    setRecentSearches((current) =>
      [trimmed, ...current.filter((item) => normalizeForSearch(item) !== key)].slice(0, MAX_RECENT_SEARCHES),
    );
  }, []);

  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches((current) => current.filter((item) => item !== query));
  }, []);

  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const value = useMemo<DiscoverState>(
    () => ({
      city: region.city,
      citySource: region.source,
      selectCity,
      locationPermission,
      enableLocation,
      origin,
      reachWindow,
      setReachWindow,
      filter,
      setFilter,
      searchQuery,
      setSearchQuery,
      sort,
      setSort,
      searchFilters,
      setSearchFilters,
      resetSearch,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
    }),
    [
      region,
      selectCity,
      locationPermission,
      enableLocation,
      origin,
      reachWindow,
      filter,
      searchQuery,
      sort,
      searchFilters,
      resetSearch,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
    ],
  );

  return <DiscoverStateContext.Provider value={value}>{children}</DiscoverStateContext.Provider>;
}

export function useDiscoverState() {
  const context = useContext(DiscoverStateContext);
  if (!context) {
    throw new Error('useDiscoverState must be used inside DiscoverStateProvider');
  }
  return context;
}
