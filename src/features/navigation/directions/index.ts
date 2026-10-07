import { hasMapboxToken } from '@/features/route-suggestion/services/mapboxConfig';

import type { NavigationDirectionsService } from '../types';
import { mapboxDirections } from './mapboxDirections';
import { mockDirections } from './mockDirections';

/** Turn-by-turn routing: Mapbox Directions with a token, the mock otherwise. */
export const navigationDirections: NavigationDirectionsService = hasMapboxToken
  ? mapboxDirections
  : mockDirections;
