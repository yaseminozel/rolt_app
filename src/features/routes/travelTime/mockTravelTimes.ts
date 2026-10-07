import { distanceKm } from '../geo';
import type { TravelTimeService } from './types';

/** Roads are longer than the straight line between two points. */
const ROAD_FACTOR = 1.35;
/** Average driving speed including towns and mountain roads. */
const AVERAGE_SPEED_KMH = 55;

/** Straight-line estimate for development without a Mapbox token. */
export const mockTravelTimes: TravelTimeService = {
  async durationsFrom(origin, destinations) {
    return destinations.map(
      (destination) => ((distanceKm(origin, destination) * ROAD_FACTOR) / AVERAGE_SPEED_KMH) * 3600,
    );
  },
};
