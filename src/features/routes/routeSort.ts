import { findCityByName } from '@/features/location/turkishCities';

import { distanceKm } from './geo';
import type { LngLat, Route, RouteSort } from './types';

function cityCentre(city: string): LngLat | null {
  const match = findCityByName(city);
  return match ? [match.longitude, match.latitude] : null;
}

const startOf = (route: Route) => route.coordinates[0];

/** "Sırala" sheet order of a result list; "En yakın" measures from the chosen city's centre. */
export function sortRoutes(routes: readonly Route[], sort: RouteSort, city: string) {
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
