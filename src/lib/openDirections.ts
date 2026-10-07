import { Linking, Platform } from 'react-native';

import type { LngLat } from '@/features/routes/types';

/**
 * Driving directions to a place in the device's maps app ("Yol tarifi"): Apple Maps on iOS,
 * Google Maps (app or web) elsewhere. ROLT itself only navigates along routes.
 */
export function openDirections([longitude, latitude]: LngLat, name: string) {
  const destination = `${latitude},${longitude}`;
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(name)}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  return Linking.openURL(url);
}
