import type { LngLat } from '../types';

/**
 * Driving time from one origin to many points ("1 saatte ulaşabileceğin", 05.01 `m3ezc`).
 * Mapbox Matrix with a token, a straight-line estimate otherwise.
 */
export interface TravelTimeService {
  /** Seconds from `origin` to each destination, in order; `null` when it can't be reached. */
  durationsFrom(origin: LngLat, destinations: readonly LngLat[]): Promise<(number | null)[]>;
}
