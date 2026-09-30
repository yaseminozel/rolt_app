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

/**
 * Seconds left until a fixed `deadline` (e.g. the lock end on 00.3 "Hesap geçici olarak
 * kilitlendi"). Unlike `useCountdown` it doesn't restart on remount and stays correct after
 * the app was backgrounded.
 */
export function useCountdownUntil(deadline: Date) {
  const deadlineMs = deadline.getTime();
  const [remaining, setRemaining] = useState(() => secondsUntil(deadlineMs));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = secondsUntil(deadlineMs);
      setRemaining(next);
      if (next === 0) {
        clearInterval(interval);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  return remaining;
}

/** "14:32" style clock with zero-padded minutes (GFGB4 lock countdown). */
export function formatClockCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "0:45" style clock for the resend countdown (AQCUg). */
export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
