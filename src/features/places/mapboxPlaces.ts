import { mapboxSearchCountry } from '@/features/route-suggestion/services/mapboxConfig';
import {
  FUEL_CATEGORY_IDS,
  getSearchBoxJson,
  REPAIR_CATEGORY_IDS,
  resolveCategoryId,
  type SearchBoxFeature,
} from '@/features/search/mapboxSearchBox';

import { openingStateFromPeriods } from './openingHours';
import type { PlacesRepository, ServicePlaceCategory } from './types';

/** Search Box returns at most 25 category results and 10 text results per request. */
const RESULT_LIMIT = 25;
const FORWARD_LIMIT = 10;

const CATEGORY_IDS: Record<ServicePlaceCategory, readonly string[]> = {
  fuel: FUEL_CATEGORY_IDS,
  repair: REPAIR_CATEGORY_IDS,
};

/** Mapbox Search Box category search inside the visible area (no ratings in Mapbox data). */
export const mapboxPlaces: PlacesRepository = {
  async listInArea({ bounds, category, query = '' }) {
    const id = await resolveCategoryId(CATEGORY_IDS[category]);
    if (!id) {
      return [];
    }
    const { southWest, northEast } = bounds;
    const area = {
      bbox: [...southWest, ...northEast].join(','),
      proximity: [(southWest[0] + northEast[0]) / 2, (southWest[1] + northEast[1]) / 2].join(','),
      country: mapboxSearchCountry,
    };
    const trimmed = query.trim();
    // With a query: text search limited to the category's places in the area.
    const data = trimmed
      ? await getSearchBoxJson<{ features: SearchBoxFeature[] }>('forward', {
          ...area,
          q: trimmed,
          types: 'poi',
          poi_category: id,
          limit: String(FORWARD_LIMIT),
        })
      : await getSearchBoxJson<{ features: SearchBoxFeature[] }>(`category/${id}`, {
          ...area,
          limit: String(RESULT_LIMIT),
        });
    const now = new Date();
    return data.features.map((feature) => ({
      id: feature.properties.mapbox_id,
      name: feature.properties.name,
      category,
      coordinates: feature.geometry.coordinates,
      address:
        feature.properties.address ??
        feature.properties.place_formatted ??
        feature.properties.full_address,
      opening: openingStateFromPeriods(feature.properties.metadata?.open_hours, now),
    }));
  },
};
