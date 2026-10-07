import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs`, for clock values shown on screen (arrival
 * times). Keeps `Date.now()` out of render so components stay pure.
 */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
