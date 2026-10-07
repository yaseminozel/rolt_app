import { mapboxToken } from '@/features/route-suggestion/services/mapboxConfig';

import type { LngLat } from '../types';
import type { TravelTimeService } from './types';

/** Matrix API limit for the `driving` profile: 25 coordinates, the origin plus 24 destinations. */
const MAX_DESTINATIONS = 24;

type MatrixResponse = {
  code: string;
  durations?: (number | null)[][];
};

async function fetchChunk(origin: LngLat, destinations: readonly LngLat[]) {
  const path = [origin, ...destinations].map(([lng, lat]) => `${lng},${lat}`).join(';');
  const query = new URLSearchParams({
    sources: '0',
    annotations: 'duration',
    access_token: mapboxToken,
  });
  const response = await fetch(
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${path}?${query}`,
  );
  const data = (await response.json()) as MatrixResponse;
  const row = data.durations?.[0];
  if (!response.ok || data.code !== 'Ok' || !row) {
    throw new Error(`Mapbox Matrix ${data.code ?? response.status}`);
  }
  // The first column is the origin itself.
  return row.slice(1);
}

/**
 * Mapbox Matrix, `driving` profile (typical traffic; `driving-traffic` allows only 10
 * coordinates). One origin row per request, destinations in chunks of 24.
 */
export const mapboxTravelTimes: TravelTimeService = {
  async durationsFrom(origin, destinations) {
    const chunks: LngLat[][] = [];
    for (let index = 0; index < destinations.length; index += MAX_DESTINATIONS) {
      chunks.push(destinations.slice(index, index + MAX_DESTINATIONS));
    }
    const rows = await Promise.all(chunks.map((chunk) => fetchChunk(origin, chunk)));
    return rows.flat();
  },
};
