import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { RECOMMENDED_LIST_IDS, ROUTE_FIXTURES } from './fixtures/routes';
import { mockRoutesRepository } from './mockRoutesRepository';
import { travelTimes } from './travelTime';
import type {
  Bounds,
  LngLat,
  ReachableRoute,
  ReachWindow,
  Route,
  RouteFilter,
  RouteSearchFilters,
  RoutesRepository,
  RouteSort,
} from './types';

/** Swap for the Supabase implementation later; screens only use the hooks below. */
export const routesRepository: RoutesRepository = mockRoutesRepository;

export const routeKeys = {
  all: ['routes'] as const,
  recommended: (city: string, filter: RouteFilter) =>
    ['routes', 'recommended', city, filter] as const,
  search: (query: string, sort: RouteSort, city: string, filters?: RouteSearchFilters) =>
    ['routes', 'search', query, sort, city, filters ?? null] as const,
  suggestions: (query: string) => ['routes', 'suggestions', query] as const,
  area: (bounds: Bounds, filter: RouteFilter, query = '') =>
    ['routes', 'area', bounds, filter, query] as const,
  detail: (id: string) => ['routes', 'detail', id] as const,
  reachable: (origin: LngLat | null) => ['routes', 'reachable', origin] as const,
};

/** "Süre seçici" options, shortest first (05.01 `m3ezc`). */
export const REACH_WINDOWS: readonly [ReachWindow, ReachWindow, ReachWindow] = [30, 60, 120];
const LONGEST_REACH_MINUTES = 120;
/** Nothing farther than this in a straight line can be driven to within two hours. */
const REACH_SEARCH_RADIUS_KM = 220;
/** Driving times barely change while the rider stays around; don't refetch on every visit. */
const REACH_STALE_TIME_MS = 10 * 60 * 1000;

async function listReachableRoutes(origin: LngLat): Promise<ReachableRoute[]> {
  const candidates = await routesRepository.listStartingNear({
    origin,
    radiusKm: REACH_SEARCH_RADIUS_KM,
  });
  if (candidates.length === 0) {
    return [];
  }
  const seconds = await travelTimes.durationsFrom(
    origin,
    candidates.map((route) => route.coordinates[0]),
  );
  return candidates
    .flatMap((route, index) => {
      const duration = seconds[index];
      if (duration === null || duration === undefined) {
        return [];
      }
      const minutesToStart = Math.max(1, Math.round(duration / 60));
      return minutesToStart <= LONGEST_REACH_MINUTES ? [{ route, minutesToStart }] : [];
    })
    .sort((a, b) => a.minutesToStart - b.minutesToStart);
}

/**
 * "1 saatte ulaşabileceğin" (05.01 `m3ezc`, 05.03 `r7NfD9`): routes whose start can be driven
 * to from `origin` within two hours, nearest first. One request covers every window; screens
 * cut the list with `withinReach`. Disabled while the rider's position is unknown.
 */
export function useReachableRoutes(origin: LngLat | null) {
  return useQuery({
    queryKey: routeKeys.reachable(origin),
    queryFn: () => listReachableRoutes(origin as LngLat),
    enabled: origin !== null,
    staleTime: REACH_STALE_TIME_MS,
  });
}

export function withinReach(routes: readonly ReachableRoute[] | undefined, window: ReachWindow) {
  return (routes ?? []).filter((item) => item.minutesToStart <= window);
}

export function useRecommendedRoutes(city: string, filter: RouteFilter) {
  return useQuery({
    queryKey: routeKeys.recommended(city, filter),
    queryFn: () => routesRepository.listRecommended({ city, filter }),
  });
}

/** "Önerilen Rotalar — Tümü" (01.4): the curated list, filtered locally by the header search. */
export function useRecommendedList() {
  return useQuery({
    queryKey: ['routes', 'recommended-list'],
    queryFn: async () =>
      RECOMMENDED_LIST_IDS.map((id) => ROUTE_FIXTURES.find((route) => route.id === id)).filter(
        (route): route is Route => route !== undefined,
      ),
  });
}

/** `filters` (search filter sheet, PXcQ0) is optional; omit it for an unfiltered search. */
export function useRouteSearch(
  query: string,
  sort: RouteSort,
  city: string,
  filters?: RouteSearchFilters,
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: routeKeys.search(trimmed, sort, city, filters),
    queryFn: () => routesRepository.search({ query: trimmed, sort, city, filters }),
    enabled: trimmed.length > 0,
  });
}

/**
 * Live result count of the search filter sheet ("N rotayı göster", PXcQ0). Same cache as
 * `useRouteSearch`, so applying the filters shows the results at once; keeps the previous
 * count while the next one loads so the button label doesn't blink.
 */
export function useRouteSearchPreview(
  query: string,
  sort: RouteSort,
  city: string,
  filters: RouteSearchFilters,
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: routeKeys.search(trimmed, sort, city, filters),
    queryFn: () => routesRepository.search({ query: trimmed, sort, city, filters }),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
}

/**
 * Typing suggestions (01.1 "Yazarken öneriler", aZnjb). Keeps the previous suggestions on
 * screen while the next query loads so the panel doesn't flicker between keystrokes.
 */
export function useSearchSuggestions(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: routeKeys.suggestions(trimmed),
    queryFn: () => routesRepository.suggest({ query: trimmed }),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useRoutesInArea(bounds: Bounds, filter: RouteFilter, query = '') {
  return useQuery({
    queryKey: routeKeys.area(bounds, filter, query),
    queryFn: () => routesRepository.listInArea({ bounds, filter, query }),
  });
}

/** "Kaydettiklerim" (09.01 tab): the bookmarked routes, most recent first. */
export function useRoutesByIds(ids: readonly string[]) {
  return useQuery({
    queryKey: ['routes', 'byIds', ids] as const,
    queryFn: () => routesRepository.listByIds(ids),
    placeholderData: keepPreviousData,
  });
}

export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: routeKeys.detail(id ?? ''),
    queryFn: () => routesRepository.getById(id ?? ''),
    enabled: Boolean(id),
  });
}
