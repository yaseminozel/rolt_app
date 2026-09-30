import { useQuery } from '@tanstack/react-query';

import { RECOMMENDED_LIST_IDS, ROUTE_FIXTURES } from './fixtures/routes';
import { mockRoutesRepository } from './mockRoutesRepository';
import type { Bounds, Route, RouteFilter, RoutesRepository, RouteSort } from './types';

/** Swap for the Supabase implementation later; screens only use the hooks below. */
export const routesRepository: RoutesRepository = mockRoutesRepository;

export const routeKeys = {
  all: ['routes'] as const,
  recommended: (city: string, filter: RouteFilter) => ['routes', 'recommended', city, filter] as const,
  search: (query: string, sort: RouteSort, city: string) => ['routes', 'search', query, sort, city] as const,
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

export function useRouteSearch(query: string, sort: RouteSort, city: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: routeKeys.search(trimmed, sort, city),
    queryFn: () => routesRepository.search({ query: trimmed, sort, city }),
    enabled: trimmed.length > 0,
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
