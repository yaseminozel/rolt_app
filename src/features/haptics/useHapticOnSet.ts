import { useEffect, useRef } from 'react';

import { haptics, type HapticEffect } from './haptics';

/**
 * Plays `effect` when `value` becomes truthy or changes to another truthy value (an error
 * appears, a lock starts, a state turns ready). A value already there on mount stays silent
 * unless `onMount` (a screen that opens straight into a state worth feeling).
 */
export function useHapticOnSet(value: unknown, effect: HapticEffect, { onMount = false } = {}) {
  const previous = useRef(onMount ? undefined : value);
  useEffect(() => {
    if (value && value !== previous.current) {
      haptics[effect]();
    }
    previous.current = value;
  }, [value, effect]);
}

/** Plays `effect` on every change of `value` after mount (e.g. a panel snapping open or shut). */
export function useHapticOnChange(value: unknown, effect: HapticEffect) {
  const previous = useRef(value);
  useEffect(() => {
    if (value !== previous.current) {
      haptics[effect]();
    }
    previous.current = value;
  }, [value, effect]);
}
