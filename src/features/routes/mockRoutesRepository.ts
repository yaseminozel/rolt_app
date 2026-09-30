import { findCityByName } from '@/features/location/turkishCities';
import { matchesSearch } from '@/lib/searchText';

import { RECOMMENDED_ROUTE_IDS, ROUTE_FIXTURES } from './fixtures/routes';
import { distanceKm, isInBounds } from './geo';
import type { LngLat, Route, RouteFilter, RoutesRepository, RouteSort } from './types';

const NETWORK_DELAY_MS = 500;
/** "Yakın Rotalar": routes starting within this distance of the chosen city's centre. */
export const NEARBY_RADIUS_KM = 60;

const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

function cityCentre(city: string): LngLat | null {
  const match = findCityByName(city);
  return match ? [match.longitude, match.latitude] : null;
}

const startOf = (route: Route) => route.coordinates[0];

function applyFilter(routes: Route[], filter: RouteFilter, city: string) {
  if (filter === 'all') {
    return routes;
  }
  if (filter === 'nearby') {
    const centre = cityCentre(city);
    return centre ? routes.filter((route) => distanceKm(startOf(route), centre) <= NEARBY_RADIUS_KM) : routes;
  }
  return routes.filter((route) => route.tag === filter);
}

function applySort(routes: Route[], sort: RouteSort, city: string) {
  const sorted = [...routes];
  const centre = cityCentre(city);
  switch (sort) {
    case 'nearest':
      return centre ? sorted.sort((a, b) => distanceKm(startOf(a), centre) - distanceKm(startOf(b), centre)) : sorted;
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
    const recommended = RECOMMENDED_ROUTE_IDS.map((id) => ROUTE_FIXTURES.find((route) => route.id === id)).filter(
      (route): route is Route => route !== undefined,
    );
    return applyFilter(recommended, filter, city);
  },

  async search({ query, sort, city }) {
    await wait();
    const matches = ROUTE_FIXTURES.filter(
      (route) => matchesSearch(route.name, query) || matchesSearch(route.summary, query),
    );
    return applySort(matches, sort, city);
  },

  async listInArea({ bounds, filter }) {
    await wait();
    const inArea = ROUTE_FIXTURES.filter((route) => route.coordinates.some((point) => isInBounds(point, bounds)));
    return applyFilter(inArea, filter, 'Antalya');
  },

  async getById(id) {
    await wait();
    return ROUTE_FIXTURES.find((route) => route.id === id) ?? null;
  },
};
