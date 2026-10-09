import { useEffect, useState } from 'react';

import { hasSupabase } from '@/lib/supabase/client';

import { supabaseUsernameService } from './supabaseUsernameService';
import {
  mockUsernameService,
  validateUsernameFormat,
  type UsernameFormatError,
  type UsernameService,
  type UsernameSuggestionHints,
} from './usernameService';

/** Supabase when configured, otherwise the mock. */
const defaultUsernameService = hasSupabase ? supabaseUsernameService : mockUsernameService;

export type UsernameStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  /** `suggestions`: free alternatives shown as chips under the field (eIU92); may be empty. */
  | { state: 'taken'; suggestions: string[] }
  | { state: 'failed' }
  | { state: 'invalid'; error: UsernameFormatError };

/** Pause after the last keystroke before validating and asking the backend. */
export const USERNAME_CHECK_DEBOUNCE_MS = 500;

type Result = { username: string; status: UsernameStatus };

/**
 * Debounced username validation + availability check. Results for an outdated value are
 * ignored; the status stays "idle" while typing and reads "checking" only while the request
 * for the current value is in flight. When the hints change (e.g. a city is picked) the
 * current value is re-checked in the background and its last result stays visible meanwhile,
 * so suggestions pick up the new city without flashing the field.
 */
export function useUsernameAvailability(
  username: string,
  hints: UsernameSuggestionHints = {},
  service: UsernameService = defaultUsernameService,
): UsernameStatus {
  const [result, setResult] = useState<Result>({ username: '', status: { state: 'idle' } });
  /** Value whose availability request is in flight (set once the debounce has elapsed). */
  const [pending, setPending] = useState('');
  const { cityPlateCode, bikeModelName } = hints;

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
      service.checkAvailability(username, { cityPlateCode, bikeModelName }).then(
        (availability) => {
          if (cancelled) return;
          setResult({
            username,
            status: availability.available
              ? { state: 'available' }
              : { state: 'taken', suggestions: availability.suggestions },
          });
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
  }, [username, cityPlateCode, bikeModelName, service]);

  if (username === '') return { state: 'idle' };
  if (result.username === username) return result.status;
  return pending === username ? { state: 'checking' } : { state: 'idle' };
}
