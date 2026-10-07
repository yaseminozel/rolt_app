import type { LngLat } from '@/features/routes/types';

/** A ride that just ended in navigation; it becomes a draft for "Sürüşü kaydet" (08.05). */
export type CompletedRide = {
  routeId: string;
  routeName: string;
  distanceM: number;
  movingS: number;
  /** Time on breaks at stops, kept apart from riding time. */
  breakS: number;
  breakCount: number;
  elapsedS: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  track: LngLat[];
  startedAt: number;
  endedAt: number;
  /** False when the rider ended navigation before the finish ("Bitir"). */
  completed: boolean;
};
