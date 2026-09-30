import { findCityByName, TURKISH_CITIES } from '@/features/location/turkishCities';
import { distanceKm } from '@/features/routes/geo';
import { NEARBY_RADIUS_KM } from '@/features/routes/mockRoutesRepository';
import type { Bounds, LngLat } from '@/features/routes/types';

const KM_PER_DEGREE_LATITUDE = 111;

/**
 * The area behind the Home map card ("Bu bölgede N rota var"): a box reaching
 * `NEARBY_RADIUS_KM` from the province centre, the same radius as "Yakın Rotalar".
 * Unknown names fall back to the first province so callers always get an area.
 */
export function cityAreaBounds(city: string): Bounds {
  const match = findCityByName(city) ?? TURKISH_CITIES[0];
  const latDelta = NEARBY_RADIUS_KM / KM_PER_DEGREE_LATITUDE;
  const lngDelta = NEARBY_RADIUS_KM / (KM_PER_DEGREE_LATITUDE * Math.cos((match.latitude * Math.PI) / 180));
  return {
    southWest: [match.longitude - lngDelta, match.latitude - latDelta],
    northEast: [match.longitude + lngDelta, match.latitude + latDelta],
  };
}

/** Province whose centre is closest to the given point (device position → Home region). */
export function nearestCityName(point: LngLat) {
  let nearest = TURKISH_CITIES[0];
  let nearestDistance = Infinity;
  for (const city of TURKISH_CITIES) {
    const distance = distanceKm(point, [city.longitude, city.latitude]);
    if (distance < nearestDistance) {
      nearest = city;
      nearestDistance = distance;
    }
  }
  return nearest.name;
}
