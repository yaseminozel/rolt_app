import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

export type ForegroundLocationPermission = {
  /** `null` until the first read finishes (don't flash the "izin kapalı" banner on launch). */
  status: Location.PermissionStatus | null;
  /** Asks the OS when it still can; otherwise opens the app's system settings. */
  enable: () => Promise<void>;
};

/**
 * Foreground location permission for Discover (01.5 "Konum izni kapalı", x3Pqz).
 * Reads without prompting and re-reads whenever the app returns to the foreground, so
 * turning access on in Settings updates Home right away.
 */
export function useForegroundLocationPermission(): ForegroundLocationPermission {
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);

  useEffect(() => {
    let active = true;
    const read = () =>
      Location.getForegroundPermissionsAsync()
        .then((response) => {
          if (active) {
            setPermission(response);
          }
        })
        // Reading can fail on devices without location services; keep the last known state.
        .catch(() => undefined);

    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        read();
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const enable = useCallback(async () => {
    if (permission?.canAskAgain === false) {
      await Linking.openSettings();
      return;
    }
    try {
      setPermission(await Location.requestForegroundPermissionsAsync());
    } catch {
      await Linking.openSettings();
    }
  }, [permission]);

  return { status: permission?.status ?? null, enable };
}
