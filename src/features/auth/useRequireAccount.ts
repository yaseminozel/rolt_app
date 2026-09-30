import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from './AuthProvider';
import { setPendingAccountAction } from './pendingAccountAction';
import type { SignInPromptReason } from './signInPromptReasons';

/**
 * Gate for account-only actions (e.g. saving a route). Returns `requireAccount(reason, action)`:
 * signed-in users run `action` right away; guests get the sign-in prompt sheet (00.15) with
 * copy for `reason`, and `action` is replayed after they sign in (see `pendingAccountAction.ts`).
 */
export function useRequireAccount() {
  const { session, isGuest } = useAuth();
  const signedIn = session?.profileCompleted === true;

  return useCallback(
    (reason: SignInPromptReason, action: () => void) => {
      if (signedIn) {
        action();
      } else if (isGuest) {
        setPendingAccountAction(action);
        router.push({ pathname: '/sign-in-prompt', params: { reason } });
      }
    },
    [signedIn, isGuest],
  );
}
