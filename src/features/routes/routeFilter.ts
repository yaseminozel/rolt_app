import { findCityByName } from '@/features/location/turkishCities';

import { distanceKm } from './geo';
import type { Route, RouteFilter } from './types';

/** "Yakın Rotalar": routes starting within this distance of the chosen city's centre. */
export const NEARBY_RADIUS_KM = 60;

/** Applies a Discover category chip ("Tümü", "Yakın Rotalar", or a route tag) to a list. */
export function filterRoutes(routes: Route[], filter: RouteFilter, city: string) {
  if (filter === 'all') {
    return routes;
  }
  if (filter === 'nearby') {
    const match = findCityByName(city);
    if (!match) {
      return routes;
    }
    const centre: [number, number] = [match.longitude, match.latitude];
    return routes.filter((route) => distanceKm(route.coordinates[0], centre) <= NEARBY_RADIUS_KM);
  }
  return routes.filter((route) => route.tag === filter);
}
