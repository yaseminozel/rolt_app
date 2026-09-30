import type { LngLat } from '@/features/routes/types';

import type { Place } from '../types';
import { mapboxSearchCountry, mapboxToken } from './mapboxConfig';
import type { PlaceSearchService, PlaceSuggestion } from './types';

const BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';

type SuggestResponse = {
  suggestions: {
    mapbox_id: string;
    name: string;
    place_formatted?: string;
    full_address?: string;
    feature_type?: string;
    distance?: number;
  }[];
};

type FeatureResponse = {
  features: {
    geometry: { coordinates: [number, number] };
    properties: { mapbox_id: string; name: string; place_formatted?: string; full_address?: string };
  }[];
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox Search Box ${response.status}`);
  }
  return (await response.json()) as T;
}

function params(values: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  search.set('access_token', mapboxToken);
  return search.toString();
}

/** Mapbox Search Box API (suggest → retrieve, reverse). Language follows the app language. */
export function createMapboxPlaceSearch(language: () => string): PlaceSearchService {
  return {
    async suggest(query, { sessionToken, proximity }) {
      const data = await getJson<SuggestResponse>(
        `${BASE_URL}/suggest?${params({
          q: query,
          session_token: sessionToken,
          language: language(),
          country: mapboxSearchCountry,
          limit: '8',
          proximity: proximity ? proximity.join(',') : 'ip',
        })}`,
      );
      return data.suggestions.map<PlaceSuggestion>((item) => ({
        id: item.mapbox_id,
        name: item.name,
        subtitle: item.place_formatted ?? item.full_address,
        category: item.feature_type,
        distanceKm: item.distance !== undefined ? item.distance / 1000 : undefined,
      }));
    },

    async retrieve(suggestion, { sessionToken }) {
      const data = await getJson<FeatureResponse>(
        `${BASE_URL}/retrieve/${encodeURIComponent(suggestion.id)}?${params({ session_token: sessionToken })}`,
      );
      const feature = data.features[0];
      if (!feature) {
        throw new Error('Mapbox Search Box: empty retrieve');
      }
      return {
        id: feature.properties.mapbox_id,
        name: feature.properties.name,
        subtitle: feature.properties.place_formatted ?? feature.properties.full_address,
        coordinates: feature.geometry.coordinates,
      };
    },

    async reverse([longitude, latitude]: LngLat): Promise<Place> {
      const data = await getJson<FeatureResponse>(
        `${BASE_URL}/reverse?${params({ longitude: String(longitude), latitude: String(latitude), language: language(), limit: '1' })}`,
      );
      const feature = data.features[0];
      return {
        id: feature?.properties.mapbox_id ?? `point-${longitude.toFixed(5)},${latitude.toFixed(5)}`,
        name: feature?.properties.name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        subtitle: feature?.properties.place_formatted,
        coordinates: [longitude, latitude],
      };
    },
  };
}
