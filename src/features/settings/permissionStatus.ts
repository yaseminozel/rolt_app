import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

export type LocationAccess = 'always' | 'whileUsing' | 'off';
export type PhotoAccess = 'all' | 'limited' | 'off';
export type NotificationAccess = 'on' | 'off';

export type PermissionStatuses = {
  location: LocationAccess;
  photos: PhotoAccess;
  notifications: NotificationAccess;
};

async function readStatuses(): Promise<PermissionStatuses> {
  if (Platform.OS === 'web') {
    return { location: 'off', photos: 'off', notifications: 'off' };
  }
  const [foreground, background, photos, notifications] = await Promise.all([
    Location.getForegroundPermissionsAsync().catch(() => null),
    Location.getBackgroundPermissionsAsync().catch(() => null),
    ImagePicker.getMediaLibraryPermissionsAsync().catch(() => null),
    Notifications.getPermissionsAsync().catch(() => null),
  ]);
  return {
    location: background?.granted ? 'always' : foreground?.granted ? 'whileUsing' : 'off',
    photos: !photos?.granted ? 'off' : photos.accessPrivileges === 'limited' ? 'limited' : 'all',
    notifications: notifications?.granted ? 'on' : 'off',
  };
}

/**
 * Current system permissions for the settings rows (10.01 "İzinler"), read again whenever the
 * screen is focused, e.g. after coming back from the phone's settings.
 */
export function usePermissionStatuses() {
  const [statuses, setStatuses] = useState<PermissionStatuses | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      readStatuses().then((next) => {
        if (!cancelled) {
          setStatuses(next);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );
  return statuses;
}
