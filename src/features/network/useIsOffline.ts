import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * True while the device has no internet connection (05.01 "Çevrimdışı"). Unknown states
 * (`isInternetReachable === null` right after launch) count as online, so the offline band
 * doesn't flash on start.
 */
export function useIsOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setOffline(state.isConnected === false || state.isInternetReachable === false);
      }),
    [],
  );

  return offline;
}
