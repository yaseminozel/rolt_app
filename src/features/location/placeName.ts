import { hasMapboxToken, mapboxToken } from '@/features/route-suggestion/services/mapboxConfig';
import { nearestCityName } from '@/features/rides/rideTitle';
import type { LngLat } from '@/features/routes/types';
import { i18n } from '@/i18n';

const GEOCODING_URL = 'https://api.mapbox.com/search/geocode/v6/reverse';
/** Smallest named area first: a ride starts "in Geyikbayırı", not at a street address. */
const PLACE_TYPES = 'neighborhood,locality,place';

type GeocodingResponse = { features: { properties: { name?: string } }[] };

/**
 * Short name of the area around a point (09.06 "Sürüş güzergahı": "Geyikbayırı"). Mapbox
 * Geocoding v6 reverse lookup; without a token or connection, the nearest province.
 */
export async function placeNameAt(point: LngLat): Promise<string | undefined> {
  if (hasMapboxToken) {
    try {
      const query = new URLSearchParams({
        longitude: String(point[0]),
        latitude: String(point[1]),
        types: PLACE_TYPES,
        limit: '1',
        language: i18n.language,
        access_token: mapboxToken,
      });
      const response = await fetch(`${GEOCODING_URL}?${query.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as GeocodingResponse;
        const name = data.features[0]?.properties.name;
        if (name) {
          return name;
        }
      }
    } catch {
      // Offline: fall back to the province below.
    }
  }
  return nearestCityName(point);
}
