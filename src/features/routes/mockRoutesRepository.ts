import { findCityByName } from '@/features/location/turkishCities';
import { matchesSearch } from '@/lib/searchText';

import { PLACE_FIXTURES } from './fixtures/places';
import { RECOMMENDED_ROUTE_IDS, ROUTE_FIXTURES } from './fixtures/routes';
import { distanceKm, isInBounds } from './geo';
import { filterRoutes } from './routeFilter';
import { matchesSearchFilters } from './searchFilters';
import type { LngLat, Route, RoutesRepository, RouteSort } from './types';

const NETWORK_DELAY_MS = 500;

/** Typing suggestions must feel instant; the backend would serve them from a prefix index. */
const SUGGEST_DELAY_MS = 150;
const SUGGESTION_LIMIT = 3;

const wait = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

function cityCentre(city: string): LngLat | null {
  const match = findCityByName(city);
  return match ? [match.longitude, match.latitude] : null;
}

const startOf = (route: Route) => route.coordinates[0];

function applySort(routes: Route[], sort: RouteSort, city: string) {
  const sorted = [...routes];
  const centre = cityCentre(city);
  switch (sort) {
    case 'nearest':
      return centre
        ? sorted.sort((a, b) => distanceKm(startOf(a), centre) - distanceKm(startOf(b), centre))
        : sorted;
    case 'shortest':
      return sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    case 'longest':
      return sorted.sort((a, b) => b.distanceKm - a.distanceKm);
    case 'popular':
    case 'recommended':
      return sorted.sort((a, b) => b.popularity - a.popularity);
  }
}

/** In-memory RoutesRepository backed by the design fixtures. */
export const mockRoutesRepository: RoutesRepository = {
  async listRecommended({ city, filter }) {
    await wait();
    const recommended = RECOMMENDED_ROUTE_IDS.map((id) =>
      ROUTE_FIXTURES.find((route) => route.id === id),
    ).filter((route): route is Route => route !== undefined);
    return filterRoutes(recommended, filter, city);
  },

  async search({ query, sort, city, filters }) {
    await wait();
    const matches = ROUTE_FIXTURES.filter(
      (route) =>
        (matchesSearch(route.name, query) || matchesSearch(route.summary, query)) &&
        (!filters || matchesSearchFilters(route, filters)),
    );
    return applySort(matches, sort, city);
  },

  async suggest({ query }) {
    await wait(SUGGEST_DELAY_MS);
    // Names only: suggestions highlight the matched letters of the name.
    const routes = ROUTE_FIXTURES.filter((route) => matchesSearch(route.name, query))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, SUGGESTION_LIMIT);
    const places = PLACE_FIXTURES.filter((place) => matchesSearch(place.name, query))
      .sort((a, b) => b.routeCount - a.routeCount)
      .slice(0, SUGGESTION_LIMIT);
    return { routes, places };
  },

  async listInArea({ bounds, filter, query = '' }) {
    await wait();
    const inArea = ROUTE_FIXTURES.filter(
      (route) =>
        route.coordinates.some((point) => isInBounds(point, bounds)) &&
        (matchesSearch(route.name, query) ||
          matchesSearch(route.summary, query) ||
          matchesSearch(route.city, query)),
    );
    return filterRoutes(inArea, filter, 'Antalya');
  },

  async listByIds(ids) {
    await wait();
    return ids.flatMap((id) => ROUTE_FIXTURES.find((route) => route.id === id) ?? []);
  },

  async getById(id) {
    await wait();
    return ROUTE_FIXTURES.find((route) => route.id === id) ?? null;
  },
};
