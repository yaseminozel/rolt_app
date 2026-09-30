import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from './AuthProvider';
import type { SignInPromptReason } from './signInPromptReasons';

/**
 * Gate for account-only actions (e.g. saving a route). Returns `requireAccount(reason, action)`:
 * signed-in users run `action` right away; guests get the sign-in prompt sheet (00.15) with
 * copy for `reason` instead.
 *
 * The action is not replayed after the guest signs in yet; CLAUDE.md asks for that
 * ("işlem girişten sonra tamamlanır") once there is a persisted pending-intent store.
 */
export function useRequireAccount() {
  const { session, isGuest } = useAuth();
  const signedIn = session?.profileCompleted === true;

  return useCallback(
    (reason: SignInPromptReason, action: () => void) => {
      if (signedIn) {
        action();
      } else if (isGuest) {
        router.push({ pathname: '/sign-in-prompt', params: { reason } });
      }
    },
    [signedIn, isGuest],
  );
}
