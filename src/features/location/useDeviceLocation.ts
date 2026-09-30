import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { LngLat } from '@/features/routes/types';

const toLngLat = ({ coords }: Location.LocationObject): LngLat => [coords.longitude, coords.latitude];

/**
 * The rider's position for map screens, foreground permission only (CLAUDE.md "Konum izni").
 * `position` is filled silently when permission was already granted; `locate()` asks for
 * permission when needed and returns `null` when it is denied or no fix is available.
 */
export function useDeviceLocation() {
  const [position, setPosition] = useState<LngLat | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted) {
          return;
        }
        const known = await Location.getLastKnownPositionAsync();
        if (!cancelled && known) {
          setPosition(toLngLat(known));
        }
      } catch {
        // No position: callers fall back (e.g. to the city centre).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locate = useCallback(async (): Promise<LngLat | null> => {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        return null;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = toLngLat(current);
      setPosition(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  return { position, locate };
}
