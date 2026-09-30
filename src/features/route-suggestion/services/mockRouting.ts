import { distanceKm } from '@/features/routes/geo';
import type { LngLat } from '@/features/routes/types';

import { MOCK_PLACES } from './mockPlaceSearch';
import { NoRouteError, type RoutingService } from './types';

/** Islands closed to motor vehicles (Adalar, İstanbul) → "Yol bulunamadı" with the nearest pier. */
const CAR_FREE_AREAS = [
  { southWest: [29.02, 40.84] as LngLat, northEast: [29.14, 40.9] as LngLat, alternativeId: 'bostanci-pier' },
];

function carFreeAreaIndex([lng, lat]: LngLat) {
  return CAR_FREE_AREAS.findIndex(
    ({ southWest, northEast }) => lng >= southWest[0] && lng <= northEast[0] && lat >= southWest[1] && lat <= northEast[1],
  );
}

/** Roads are longer than straight lines; this keeps mock numbers plausible. */
const ROAD_FACTOR = 1.3;
const AVERAGE_SPEED_KMH = 42;

/**
 * MOCK used when no Mapbox token is set: a gently curved line through the points with
 * plausible distance / duration, so the flow works end to end offline and in Expo Go.
 */
export const mockRouting: RoutingService = {
  async route(coordinates) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const blocked = coordinates.findIndex((point) => carFreeAreaIndex(point) !== -1);
    if (blocked !== -1) {
      const area = CAR_FREE_AREAS[carFreeAreaIndex(coordinates[blocked])];
      const alternative = MOCK_PLACES.find((place) => place.id === area.alternativeId) ?? null;
      throw new NoRouteError(
        blocked,
        'noMotorVehicles',
        alternative && { id: alternative.id, name: alternative.name, subtitle: alternative.subtitle, coordinates: alternative.coordinates },
      );
    }
    const geometry: LngLat[] = [];
    let straightKm = 0;
    coordinates.forEach((point, index) => {
      const next = coordinates[index + 1];
      geometry.push(point);
      if (next) {
        straightKm += distanceKm(point, next);
        for (let step = 1; step < 8; step += 1) {
          const t = step / 8;
          const bend = Math.sin(t * Math.PI) * 0.06 * (index % 2 === 0 ? 1 : -1);
          const lng = point[0] + (next[0] - point[0]) * t;
          const lat = point[1] + (next[1] - point[1]) * t;
          // Perpendicular offset so the line curves like a road.
          geometry.push([lng - (next[1] - point[1]) * bend, lat + (next[0] - point[0]) * bend]);
        }
      }
    });
    const distance = straightKm * ROAD_FACTOR;
    return {
      distanceKm: distance,
      durationMinutes: (distance / AVERAGE_SPEED_KMH) * 60,
      elevationGainM: Math.round(distance * 5.6),
      geometry,
    };
  },
};
