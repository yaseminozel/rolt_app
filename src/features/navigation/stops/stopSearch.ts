import type { LngLat } from '@/features/routes/types';

/** Category chips of "Durak ekle" (06.02); `null` is "Tümü". */
export type StopCategory = 'fuel' | 'cafe' | 'mechanic' | 'viewpoint';

export const STOP_CATEGORIES: readonly StopCategory[] = ['fuel', 'cafe', 'mechanic', 'viewpoint'];

/** A place that can become a stop. Names come from the provider and are shown as-is. */
export type StopCandidate = {
  id: string;
  name: string;
  category?: StopCategory;
  coordinates: LngLat;
  /** Address or area line from the provider, used by "Haritadan seç". */
  address?: string;
};

/** Places to stop along the ride (06.02 "ROTA BOYUNCA" and the search field). */
export interface StopSearchService {
  /** Points of interest near the route line; every category when `category` is null. */
  alongRoute(params: { line: LngLat[]; category: StopCategory | null }): Promise<StopCandidate[]>;
  /** Free-text search near the route. */
  search(params: { query: string; line: LngLat[] }): Promise<StopCandidate[]>;
  /** Address of a point picked on the map. */
  reverse(coordinates: LngLat): Promise<StopCandidate>;
}
