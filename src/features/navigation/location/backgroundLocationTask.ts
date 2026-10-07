import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { LocationFix } from '../types';
import { fixFromLocation } from './fixFromLocation';

/**
 * Background location for navigation while the screen is locked or the app is in the pocket
 * (06.04 "Ekran kilitliyken de kaydet"). The task must be defined at module load, before
 * `startLocationUpdatesAsync`, so the root layout imports this file for its side effect (keep that
 * import even though nothing from it is used there). Fixes go to whoever listens in-process.
 */
export const NAVIGATION_LOCATION_TASK = 'rolt-navigation-location';

type Listener = (fix: LocationFix) => void;
const listeners = new Set<Listener>();

export function addBackgroundFixListener(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    NAVIGATION_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data) {
        return;
      }
      for (const location of data.locations) {
        const fix = fixFromLocation(location);
        listeners.forEach((listener) => listener(fix));
      }
    },
  );
}
