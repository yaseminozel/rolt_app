import { mapboxSearchCountry } from '@/features/route-suggestion/services/mapboxConfig';
import {
  FUEL_CATEGORY_IDS,
  getSearchBoxJson,
  REPAIR_CATEGORY_IDS,
  resolveCategoryId,
  type SearchBoxFeature,
} from '@/features/search/mapboxSearchBox';

import { sampleLine } from '../geometry';
import { encodePolyline6 } from './polyline';
import {
  STOP_CATEGORIES,
  type StopCandidate,
  type StopCategory,
  type StopSearchService,
} from './stopSearch';

/** Search-along-route allows this much extra driving time for a result (minutes). */
const TIME_DEVIATION_MIN = 15;
const RESULT_LIMIT = 10;
/** Route geometry sent with the request is thinned to keep the URL short. */
const ROUTE_POINTS = 120;

/**
 * Preferred Search Box canonical ids per chip, best first (all checked against `/list/category`
 * on 2026-10-08). The available ids are read once at runtime and the first match is used.
 */
const CATEGORY_CANDIDATES: Record<StopCategory, readonly string[]> = {
  fuel: FUEL_CATEGORY_IDS,
  cafe: ['cafe', 'coffee_shop', 'coffee'],
  mechanic: REPAIR_CATEGORY_IDS,
  viewpoint: ['viewpoint', 'tourist_attraction'],
};

async function resolveCategoryIds() {
  const entries = await Promise.all(
    STOP_CATEGORIES.map(
      async (category) =>
        [category, await resolveCategoryId(CATEGORY_CANDIDATES[category])] as const,
    ),
  );
  return Object.fromEntries(entries) as Partial<Record<StopCategory, string>>;
}

const toCandidate = (feature: SearchBoxFeature, category?: StopCategory): StopCandidate => ({
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
        const data = await getSearchBoxJson<{ features: SearchBoxFeature[] }>(`category/${id}`, {
          route,
          route_geometry: 'polyline6',
          sar_type: 'isochrone',
          time_deviation: String(TIME_DEVIATION_MIN),
          limit: String(RESULT_LIMIT),
          country: mapboxSearchCountry,
        });
        return data.features.map((feature) => toCandidate(feature, item));
      }),
    );
    return results.flat();
  },

  async search({ query, line }) {
    const middle = line[Math.floor(line.length / 2)];
    const data = await getSearchBoxJson<{ features: SearchBoxFeature[] }>('forward', {
      q: query,
      limit: String(RESULT_LIMIT),
      proximity: middle.join(','),
      country: mapboxSearchCountry,
    });
    return data.features.map((feature) => toCandidate(feature));
  },

  async reverse([longitude, latitude]) {
    const data = await getSearchBoxJson<{ features: SearchBoxFeature[] }>('reverse', {
      longitude: String(longitude),
      latitude: String(latitude),
      limit: '1',
    });
    const feature = data.features[0];
    return feature
      ? toCandidate(feature)
      : {
          id: `point-${longitude.toFixed(5)},${latitude.toFixed(5)}`,
          name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          coordinates: [longitude, latitude],
        };
  },
};
