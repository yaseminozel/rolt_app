import { mapboxSearchCountry, mapboxToken } from '@/features/route-suggestion/services/mapboxConfig';
import type { LngLat } from '@/features/routes/types';
import { i18n } from '@/i18n';

import { sampleLine } from '../geometry';
import { encodePolyline6 } from './polyline';
import { STOP_CATEGORIES, type StopCandidate, type StopCategory, type StopSearchService } from './stopSearch';

const BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';
/** Search-along-route allows this much extra driving time for a result (minutes). */
const TIME_DEVIATION_MIN = 15;
const RESULT_LIMIT = 10;
/** Route geometry sent with the request is thinned to keep the URL short. */
const ROUTE_POINTS = 120;

/**
 * Preferred Search Box canonical ids per chip, best first. The available ids are read once from
 * `/list/category` and the first match is used, so the app doesn't depend on guessed names.
 */
const CATEGORY_CANDIDATES: Record<StopCategory, string[]> = {
  fuel: ['gas_station', 'fuel', 'petrol_station'],
  cafe: ['cafe', 'coffee', 'coffee_shop'],
  mechanic: ['motorcycle_repair', 'auto_repair', 'car_repair', 'vehicle_repair'],
  viewpoint: ['viewpoint', 'scenic_lookout', 'lookout', 'tourist_attraction'],
};

type Feature = {
  geometry: { coordinates: LngLat };
  properties: { mapbox_id: string; name: string; full_address?: string; place_formatted?: string };
};

let categoryIds: Promise<Partial<Record<StopCategory, string>>> | null = null;

const params = (values: Record<string, string>) =>
  new URLSearchParams({ ...values, access_token: mapboxToken, language: i18n.language }).toString();

async function getJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox Search Box ${response.status}`);
  }
  return (await response.json()) as T;
}

function resolveCategoryIds() {
  categoryIds ??= getJson<{ listItems: { canonical_id: string }[] }>(`${BASE_URL}/list/category?${params({})}`)
    .then(({ listItems }) => {
      const available = new Set(listItems.map((item) => item.canonical_id));
      return Object.fromEntries(
        STOP_CATEGORIES.map((category) => [category, CATEGORY_CANDIDATES[category].find((id) => available.has(id))]),
      ) as Partial<Record<StopCategory, string>>;
    })
    .catch((error) => {
      categoryIds = null;
      throw error;
    });
  return categoryIds;
}

const toCandidate = (feature: Feature, category?: StopCategory): StopCandidate => ({
  id: feature.properties.mapbox_id,
  name: feature.properties.name,
  category,
  coordinates: feature.geometry.coordinates,
  address: feature.properties.place_formatted ?? feature.properties.full_address,
});

/** Mapbox Search Box: category search along the route, forward search, reverse geocoding. */
export const mapboxStopSearch: StopSearchService = {
  async alongRoute({ line, category }) {
    const ids = await resolveCategoryIds();
    const route = encodePolyline6(sampleLine(line, ROUTE_POINTS));
    const categories = category ? [category] : STOP_CATEGORIES;
    const results = await Promise.all(
      categories.map(async (item) => {
        const id = ids[item];
        if (!id) {
          return [];
        }
        const data = await getJson<{ features: Feature[] }>(
          `${BASE_URL}/category/${id}?${params({
            route,
            route_geometry: 'polyline6',
            sar_type: 'isochrone',
            time_deviation: String(TIME_DEVIATION_MIN),
            limit: String(RESULT_LIMIT),
            country: mapboxSearchCountry,
          })}`,
        );
        return data.features.map((feature) => toCandidate(feature, item));
      }),
    );
    return results.flat();
  },

  async search({ query, line }) {
    const middle = line[Math.floor(line.length / 2)];
    const data = await getJson<{ features: Feature[] }>(
      `${BASE_URL}/forward?${params({
        q: query,
        limit: String(RESULT_LIMIT),
        proximity: middle.join(','),
        country: mapboxSearchCountry,
      })}`,
    );
    return data.features.map((feature) => toCandidate(feature));
  },

  async reverse([longitude, latitude]) {
    const data = await getJson<{ features: Feature[] }>(
      `${BASE_URL}/reverse?${params({ longitude: String(longitude), latitude: String(latitude), limit: '1' })}`,
    );
    const feature = data.features[0];
    return feature
      ? toCandidate(feature)
      : { id: `point-${longitude.toFixed(5)},${latitude.toFixed(5)}`, name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, coordinates: [longitude, latitude] };
  },
};
