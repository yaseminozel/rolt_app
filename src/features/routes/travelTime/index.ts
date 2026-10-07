import { hasMapboxToken } from '@/features/route-suggestion/services/mapboxConfig';

import { mapboxTravelTimes } from './mapboxTravelTimes';
import { mockTravelTimes } from './mockTravelTimes';
import type { TravelTimeService } from './types';

/** Driving times to route starts: Mapbox Matrix with a token, the straight-line mock otherwise. */
export const travelTimes: TravelTimeService = hasMapboxToken ? mapboxTravelTimes : mockTravelTimes;

export type { TravelTimeService } from './types';
