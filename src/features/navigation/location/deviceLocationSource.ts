import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { LocationPowerMode, LocationProfile, LocationSource } from '../types';
import { addBackgroundFixListener, NAVIGATION_LOCATION_TASK } from './backgroundLocationTask';
import { fixFromLocation } from './fixFromLocation';

type FixOptions = Pick<Location.LocationOptions, 'accuracy' | 'timeInterval' | 'distanceInterval'>;

/**
 * How hard the GPS works (CLAUDE.md "GPS profili"). While riding, fixes come every second with no
 * distance filter: with one (iOS `distanceFilter`, Android minimum displacement) the phone stops
 * sending fixes as soon as the bike stands still, and a red light looked like lost GPS. Standing
 * jitter is dropped by the recorder (`RECORDER_RULES.minStepM`) and navigation instead. While
 * the rider has paused by hand, a coarse, slow fix is enough to keep the map's dot roughly right;
 * "Devam et" switches straight back.
 *
 * `standing` (stood still for `STANDING_POWER_RULES.standingAfterMs`) keeps fixes coming without
 * a distance filter, so silence still means lost GPS: Android slows to one fix every 3 s. iOS
 * ignores `timeInterval`; lowering its accuracy instead could make an iPhone go quiet at a light
 * and bring back the false "GPS kayboldu" (2026-10-09), so on iOS `standing` is `active` until
 * that is measured on a device with the dev GPS panel.
 */
const STANDING_FIX: FixOptions =
  Platform.OS === 'ios' ? { timeInterval: 1000, distanceInterval: 0 } : { timeInterval: 3000, distanceInterval: 0 };

const FIX_OPTIONS: Record<LocationProfile, Record<LocationPowerMode, FixOptions>> = {
  navigation: {
    active: { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    standing: { accuracy: Location.Accuracy.BestForNavigation, ...STANDING_FIX },
    idle: { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
  },
  recording: {
    active: { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
    standing: { accuracy: Location.Accuracy.Highest, ...STANDING_FIX },
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
    kind: () => (background ? 'backgroundTask' : 'foregroundWatch'),
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
