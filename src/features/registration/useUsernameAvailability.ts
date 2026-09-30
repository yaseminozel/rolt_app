import { useEffect, useState } from 'react';

import {
  mockUsernameService,
  validateUsernameFormat,
  type UsernameFormatError,
  type UsernameService,
} from './usernameService';

export type UsernameStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken' }
  | { state: 'failed' }
  | { state: 'invalid'; error: UsernameFormatError };

/** Pause after the last keystroke before validating and asking the backend. */
export const USERNAME_CHECK_DEBOUNCE_MS = 500;

type Result = { username: string; status: UsernameStatus };

/**
 * Debounced username validation + availability check. Results for an outdated value are
 * ignored; the status stays "idle" while typing and reads "checking" only while the request
 * for the current value is in flight.
 */
export function useUsernameAvailability(
  username: string,
  service: UsernameService = mockUsernameService,
): UsernameStatus {
  const [result, setResult] = useState<Result>({ username: '', status: { state: 'idle' } });
  /** Value whose availability request is in flight (set once the debounce has elapsed). */
  const [pending, setPending] = useState('');

  useEffect(() => {
    if (username === '') return;
    let cancelled = false;

    const timer = setTimeout(() => {
      const formatError = validateUsernameFormat(username);
      if (formatError) {
        setResult({ username, status: { state: 'invalid', error: formatError } });
        return;
      }
      setPending(username);
      service.isAvailable(username).then(
        (available) => {
          if (!cancelled) {
            setResult({ username, status: { state: available ? 'available' : 'taken' } });
          }
        },
        () => {
          if (!cancelled) setResult({ username, status: { state: 'failed' } });
        },
      );
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, service]);

  if (username === '') return { state: 'idle' };
  if (result.username === username) return result.status;
  return pending === username ? { state: 'checking' } : { state: 'idle' };
}
