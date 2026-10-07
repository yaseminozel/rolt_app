import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { LocationSource } from '../types';
import { addBackgroundFixListener, NAVIGATION_LOCATION_TASK } from './backgroundLocationTask';
import { fixFromLocation } from './fixFromLocation';

/**
 * Real GPS. With "Her zaman" (background) permission the background task delivers fixes, so
 * guidance and the ride recording keep going with the screen locked (Android shows the
 * foreground-service notification); otherwise a foreground watch is used, which pauses while
 * the app is in the background.
 */
export function createDeviceLocationSource(notification: { title: string; body: string }): LocationSource {
  return {
    now: () => Date.now(),
    async start(onFix) {
      const background =
        Platform.OS !== 'web' && (await Location.getBackgroundPermissionsAsync().catch(() => null))?.granted;

      if (background) {
        const unsubscribe = addBackgroundFixListener(onFix);
        await Location.startLocationUpdatesAsync(NAVIGATION_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
          activityType: Location.ActivityType.AutomotiveNavigation,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: notification.title,
            notificationBody: notification.body,
          },
        });
        return () => {
          unsubscribe();
          Location.stopLocationUpdatesAsync(NAVIGATION_LOCATION_TASK).catch(() => undefined);
        };
      }

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
        (location) => onFix(fixFromLocation(location)),
      );
      return () => subscription.remove();
    },
  };
}
