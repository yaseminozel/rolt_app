import { useEffect, useState } from 'react';

const TICK_MS = 250;

const secondsUntil = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

/**
 * Seconds left until a fixed `deadline` (e.g. the sign-in lock end on 02.02 "Çok fazla deneme");
 * 0 without a deadline. Derived from the timestamp, so it stays correct after the app was
 * backgrounded.
 */
export function useCountdownUntil(deadline: Date | null) {
  const deadlineMs = deadline?.getTime() ?? 0;
  const [state, setState] = useState(() => ({ deadlineMs, remaining: secondsUntil(deadlineMs) }));

  // A new deadline restarts the count right away instead of after the first tick.
  if (state.deadlineMs !== deadlineMs) {
    setState({ deadlineMs, remaining: secondsUntil(deadlineMs) });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const next = secondsUntil(deadlineMs);
      setState({ deadlineMs, remaining: next });
      if (next === 0) {
        clearInterval(interval);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  return state.deadlineMs === deadlineMs ? state.remaining : secondsUntil(deadlineMs);
}

/** "14:59" style clock with zero-padded minutes (rjPx3 lock countdown). */
export function formatClockCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "0:45" style clock for the resend countdown (02.04 / 02.07). */
export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
