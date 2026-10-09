import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { LocationPowerMode, LocationProfile, LocationSource } from '../types';
import { addBackgroundFixListener, NAVIGATION_LOCATION_TASK } from './backgroundLocationTask';
import { fixFromLocation } from './fixFromLocation';

type FixOptions = Pick<Location.LocationOptions, 'accuracy' | 'timeInterval' | 'distanceInterval'>;

/**
 * How hard the GPS works (CLAUDE.md "GPS profili"). Navigation needs every fix it can get; a
 * free ride drops steps under 5 m anyway (`RECORDER_RULES.minStepM`), so asking for closer ones
 * only costs battery. While the rider has paused by hand, a coarse, slow fix is enough to keep
 * the map's dot roughly right; "Devam et" switches straight back.
 */
const FIX_OPTIONS: Record<LocationProfile, Record<LocationPowerMode, FixOptions>> = {
  navigation: {
    active: { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
    idle: { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
  },
  recording: {
    active: { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 5 },
    idle: { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
  },
};

/**
 * Real GPS. With "Her zaman" (background) permission the background task delivers fixes, so
 * guidance and the ride recording keep going with the screen locked (Android shows the
 * foreground-service notification); otherwise a foreground watch is used, which pauses while
 * the app is in the background.
 */
export function createDeviceLocationSource(
  notification: { title: string; body: string },
  profile: LocationProfile = 'navigation',
): LocationSource {
  let background = false;
  let mode: LocationPowerMode = 'active';
  let onFixRef: ((fix: Parameters<Parameters<LocationSource['start']>[0]>[0]) => void) | null = null;
  let watch: Location.LocationSubscription | null = null;

  const startBackground = () =>
    Location.startLocationUpdatesAsync(NAVIGATION_LOCATION_TASK, {
      ...FIX_OPTIONS[profile][mode],
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: notification.title,
        notificationBody: notification.body,
      },
    });

  const startWatch = async () => {
    watch?.remove();
    watch = await Location.watchPositionAsync(FIX_OPTIONS[profile][mode], (location) =>
      onFixRef?.(fixFromLocation(location)),
    );
  };

  return {
    now: () => Date.now(),
    async start(onFix) {
      onFixRef = onFix;
      background =
        Platform.OS !== 'web' &&
        Boolean((await Location.getBackgroundPermissionsAsync().catch(() => null))?.granted);

      if (background) {
        const unsubscribe = addBackgroundFixListener(onFix);
        await startBackground();
        return () => {
          unsubscribe();
          onFixRef = null;
          Location.stopLocationUpdatesAsync(NAVIGATION_LOCATION_TASK).catch(() => undefined);
        };
      }

      await startWatch();
      return () => {
        onFixRef = null;
        watch?.remove();
        watch = null;
      };
    },
    async setPowerMode(next) {
      if (next === mode || !onFixRef) {
        mode = next;
        return;
      }
      mode = next;
      // The background task takes the new options in place (no stop: Android may not restart a
      // foreground service from the background); the foreground watch is replaced.
      await (background ? startBackground() : startWatch()).catch(() => undefined);
    },
  };
}
