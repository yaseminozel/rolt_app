import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { LocationFix } from '../types';
import { fixFromLocation } from './fixFromLocation';

/**
 * Background location for navigation while the screen is locked or the app is in the pocket
 * (06.04 "Ekran kilitliyken de kaydet"). The task must be defined at module load, so this file
 * is imported once from the root layout. Fixes are handed to whoever is listening in-process.
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
