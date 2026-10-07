import { useSyncExternalStore } from 'react';

import type { LngLat } from '@/features/routes/types';

/** A ride that just ended in navigation, waiting for the Record flow's "Sürüşü kaydet" (08.05). */
export type CompletedRide = {
  routeId: string;
  routeName: string;
  distanceM: number;
  movingS: number;
  /** Time on breaks at stops, kept apart from riding time. */
  breakS: number;
  elapsedS: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  track: LngLat[];
  startedAt: number;
  endedAt: number;
  /** False when the rider ended navigation before the finish ("Bitir"). */
  completed: boolean;
};

let current: CompletedRide | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/** Hands a finished ride to the Record tab (in memory until rides are stored locally). */
export function setCompletedRide(ride: CompletedRide | null) {
  current = ride;
  notify();
}

export function getCompletedRide() {
  return current;
}

export function useCompletedRide() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
