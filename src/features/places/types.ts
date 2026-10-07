import type { Bounds, LngLat } from '@/features/routes/types';

/** What "Haritada Keşfet" can show besides routes (07.02 Benzinlikler, 07.03 Tamirciler). */
export type ServicePlaceCategory = 'fuel' | 'repair';

/** `open24h` "24 saat açık", `open` "Şu an açık", `closed` "Şu an kapalı"; unknown when absent. */
export type OpeningState = 'open24h' | 'open' | 'closed';

/** A fuel station or repair shop. Names and addresses come from the provider, shown as-is. */
export type ServicePlace = {
  id: string;
  name: string;
  category: ServicePlaceCategory;
  coordinates: LngLat;
  address?: string;
  /** 0–5; providers without ratings (Mapbox) leave it out and the row hides it. */
  rating?: number;
  opening?: OpeningState;
};

export interface PlacesRepository {
  /** Places of `category` inside the visible map area. */
  listInArea(params: { bounds: Bounds; category: ServicePlaceCategory }): Promise<ServicePlace[]>;
}
