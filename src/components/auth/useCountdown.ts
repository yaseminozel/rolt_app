import { useCallback, useEffect, useState } from 'react';

const TICK_MS = 250;

const secondsUntil = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

/**
 * Seconds left until a deadline that starts `durationSeconds` from mount. Derived from a
 * timestamp, so it stays correct after the app was backgrounded. `restart` starts a new run.
 */
export function useCountdown(durationSeconds: number) {
  const [deadline, setDeadline] = useState(() => Date.now() + durationSeconds * 1000);
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = secondsUntil(deadline);
      setRemaining(next);
      if (next === 0) {
        clearInterval(interval);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [deadline]);

  const restart = useCallback(() => {
    setDeadline(Date.now() + durationSeconds * 1000);
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  return { remaining, restart };
}

/** "0:45" style clock for the resend countdown (AQCUg). */
export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
