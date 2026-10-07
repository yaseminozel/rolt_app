import type * as Location from 'expo-location';

import type { LocationFix } from '../types';

/** expo-location reading → navigation fix (negative speed/heading mean "unknown"). */
export function fixFromLocation({ coords, timestamp }: Location.LocationObject): LocationFix {
  return {
    coordinates: [coords.longitude, coords.latitude],
    accuracyM: coords.accuracy ?? Number.POSITIVE_INFINITY,
    speedMps: coords.speed !== null && coords.speed >= 0 ? coords.speed : null,
    headingDeg: coords.heading !== null && coords.heading >= 0 ? coords.heading : null,
    timestamp,
  };
}
