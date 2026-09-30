import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { RECOMMENDED_LIST_IDS, ROUTE_FIXTURES } from './fixtures/routes';
import { mockRoutesRepository } from './mockRoutesRepository';
import type { Bounds, Route, RouteFilter, RouteSearchFilters, RoutesRepository, RouteSort } from './types';

/** Swap for the Supabase implementation later; screens only use the hooks below. */
export const routesRepository: RoutesRepository = mockRoutesRepository;

export const routeKeys = {
  all: ['routes'] as const,
  recommended: (city: string, filter: RouteFilter) => ['routes', 'recommended', city, filter] as const,
  search: (query: string, sort: RouteSort, city: string, filters?: RouteSearchFilters) =>
    ['routes', 'search', query, sort, city, filters ?? null] as const,
  suggestions: (query: string) => ['routes', 'suggestions', query] as const,
  area: (bounds: Bounds, filter: RouteFilter) => ['routes', 'area', bounds, filter] as const,
  detail: (id: string) => ['routes', 'detail', id] as const,
};

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
export function useRouteSearch(query: string, sort: RouteSort, city: string, filters?: RouteSearchFilters) {
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
export function useRouteSearchPreview(query: string, sort: RouteSort, city: string, filters: RouteSearchFilters) {
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

export function useRoutesInArea(bounds: Bounds, filter: RouteFilter) {
  return useQuery({
    queryKey: routeKeys.area(bounds, filter),
    queryFn: () => routesRepository.listInArea({ bounds, filter }),
  });
}

export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: routeKeys.detail(id ?? ''),
    queryFn: () => routesRepository.getById(id ?? ''),
    enabled: Boolean(id),
  });
}
