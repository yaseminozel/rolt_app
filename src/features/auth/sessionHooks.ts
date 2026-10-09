/**
 * Work features must do around the account switching, without the auth layer knowing them:
 * e.g. removing this device's push token before signing out (it needs the old session), or
 * syncing local rides after signing in. Hooks run in registration order; failures are ignored
 * so they can never block signing in or out.
 */
type Hook = () => Promise<void> | void;

const beforeSignOut = new Set<Hook>();
const afterSignIn = new Set<Hook>();

/** Runs while the session is still valid, right before signing out or deleting the account. */
export function onBeforeSignOut(hook: Hook) {
  beforeSignOut.add(hook);
  return () => beforeSignOut.delete(hook);
}

/** Runs after a session became usable (sign-in, sign-up, verified link, app start with a session). */
export function onAfterSignIn(hook: Hook) {
  afterSignIn.add(hook);
  return () => afterSignIn.delete(hook);
}

async function runAll(hooks: Set<Hook>) {
  for (const hook of [...hooks]) {
    try {
      await hook();
    } catch (error) {
      if (__DEV__) {
        console.warn('session hook failed', error);
      }
    }
  }
}

export const runBeforeSignOut = () => runAll(beforeSignOut);
export const runAfterSignIn = () => runAll(afterSignIn);
