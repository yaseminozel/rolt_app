import { mapboxToken } from '@/features/route-suggestion/services/mapboxConfig';
import type { LngLat } from '@/features/routes/types';
import { i18n } from '@/i18n';

const BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';

/** Preferred Search Box category ids, best first (see `resolveCategoryId`). */
export const FUEL_CATEGORY_IDS = ['gas_station', 'fuel', 'petrol_station'] as const;
export const REPAIR_CATEGORY_IDS = [
  'motorcycle_repair',
  'auto_repair',
  'car_repair',
  'vehicle_repair',
] as const;

/** A Search Box GeoJSON result; `metadata` only on category and retrieve responses. */
export type SearchBoxFeature = {
  geometry: { coordinates: LngLat };
  properties: {
    mapbox_id: string;
    name: string;
    full_address?: string;
    place_formatted?: string;
    address?: string;
    metadata?: { open_hours?: SearchBoxOpenHours };
  };
};

/** Weekly opening periods; `day` 0 = Monday, `time` "HHmm". A period without `close` never closes. */
export type SearchBoxOpenHours = {
  periods?: { open: { day: number; time: string }; close?: { day: number; time: string } }[];
};

/** Search Box URL with the token and the app language. */
export function searchBoxUrl(path: string, values: Record<string, string> = {}) {
  const query = new URLSearchParams({
    ...values,
    access_token: mapboxToken,
    language: i18n.language,
  });
  return `${BASE_URL}/${path}?${query.toString()}`;
}

export async function getSearchBoxJson<T>(path: string, values?: Record<string, string>) {
  const response = await fetch(searchBoxUrl(path, values));
  if (!response.ok) {
    throw new Error(`Mapbox Search Box ${response.status}`);
  }
  return (await response.json()) as T;
}

let categoryIds: Promise<Set<string>> | null = null;

/**
 * First of `candidates` (best first) that Search Box offers as a category id. The list is read
 * once from `/list/category`, so the app doesn't depend on guessed names.
 */
export async function resolveCategoryId(candidates: readonly string[]) {
  categoryIds ??= getSearchBoxJson<{ listItems: { canonical_id: string }[] }>('list/category')
    .then(({ listItems }) => new Set(listItems.map((item) => item.canonical_id)))
    .catch((error) => {
      categoryIds = null;
      throw error;
    });
  const available = await categoryIds;
  return candidates.find((id) => available.has(id));
}
