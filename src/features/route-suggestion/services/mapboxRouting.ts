import type { LngLat } from '@/features/routes/types';

import { mapboxToken } from './mapboxConfig';
import { NoRouteError, type RoutingService } from './types';

type DirectionsResponse = {
  code: string;
  routes: { distance: number; duration: number; geometry: { coordinates: LngLat[] } }[];
};

/**
 * Mapbox Directions API, `driving` profile (no motorcycle profile exists; docs/mapbox-routing.md).
 * Up to 25 coordinates per request. The geometry is for display only and isn't stored.
 */
export const mapboxRouting: RoutingService = {
  async route(coordinates) {
    const path = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const query = new URLSearchParams({
      geometries: 'geojson',
      overview: 'full',
      access_token: mapboxToken,
    });
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}?${query}`);
    const data = (await response.json()) as DirectionsResponse;
    const route = data.routes?.[0];
    // Directions reports unreachable points as NoRoute / NoSegment; it can't suggest an alternative.
    if (data.code === 'NoRoute' || data.code === 'NoSegment') {
      throw new NoRouteError(null, 'unreachable');
    }
    if (!response.ok || data.code !== 'Ok' || !route) {
      throw new Error(`Mapbox Directions ${data.code ?? response.status}`);
    }
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: route.geometry.coordinates,
    };
  },
};
