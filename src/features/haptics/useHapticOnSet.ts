import { useEffect, useRef } from 'react';

import { haptics, type HapticEffect } from './haptics';

/**
 * Plays `effect` when `value` becomes truthy or changes to another truthy value (an error
 * appears, a lock starts, a state turns ready). A value already there on mount stays silent.
 */
export function useHapticOnSet(value: unknown, effect: HapticEffect) {
  const previous = useRef(value);
  useEffect(() => {
    if (value && value !== previous.current) {
      haptics[effect]();
    }
    previous.current = value;
  }, [value, effect]);
}
