import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { useRouteSuggestion } from './RouteSuggestionProvider';
import type { Waypoint } from './types';

/**
 * A stop added with "Ara durak ekle" opens its search right away; if the rider leaves the search
 * (or "Haritadan seç") without choosing a place, the empty stop is removed again. Call
 * `handOff()` before choosing a place or passing the stop on to another picker screen.
 * `isLeaving()` is true once the screen is being removed, so it doesn't navigate a second time.
 */
export function useDiscardEmptyStop(waypoint: Waypoint | null) {
  const navigation = useNavigation();
  const { removeStop } = useRouteSuggestion();
  const waypointId = waypoint?.id ?? null;
  const discardable = useRef(waypoint?.kind === 'stop' && waypoint.place === null);
  const handedOff = useRef(false);
  const leaving = useRef(false);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        leaving.current = true;
        if (discardable.current && !handedOff.current && waypointId) {
          removeStop(waypointId);
        }
      }),
    [navigation, removeStop, waypointId],
  );

  const handOff = useCallback(() => {
    handedOff.current = true;
  }, []);
  const isLeaving = useCallback(() => leaving.current, []);

  return { handOff, isLeaving };
}
