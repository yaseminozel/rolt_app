import { hasMapboxToken } from '@/features/route-suggestion/services/mapboxConfig';

import { mapboxPlaces } from './mapboxPlaces';
import { mockPlaces } from './mockPlaces';
import type { PlacesRepository } from './types';

/** Fuel stations and repair shops: Mapbox Search Box with a token, mock places otherwise. */
export const placesRepository: PlacesRepository = hasMapboxToken ? mapboxPlaces : mockPlaces;

export * from './types';
