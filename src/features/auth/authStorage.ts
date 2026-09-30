import * as SecureStore from 'expo-secure-store';

import type { Session } from './types';

const SESSION_KEY = 'rolt.session';
const GUEST_KEY = 'rolt.guest';
const ONBOARDING_SEEN_KEY = 'rolt.onboardingSeen';
const PERMISSION_PROMPTS_KEY = 'rolt.permissionPromptsPending';

export type PersistedAuthState = {
  session: Session | null;
  isGuest: boolean;
  hasSeenOnboarding: boolean;
  /** True between finishing registration and leaving the permission screens (00.13–00.14). */
  permissionPromptsPending: boolean;
};

async function read(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null) {
  try {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    // Persistence is best-effort; the in-memory state stays authoritative.
  }
}

export async function loadAuthState(): Promise<PersistedAuthState> {
  const [session, guest, onboardingSeen, permissionPrompts] = await Promise.all([
    read(SESSION_KEY),
    read(GUEST_KEY),
    read(ONBOARDING_SEEN_KEY),
    read(PERMISSION_PROMPTS_KEY),
  ]);
  let parsedSession: Session | null = null;
  if (session) {
    try {
      parsedSession = JSON.parse(session) as Session;
    } catch {
      parsedSession = null;
    }
  }
  return {
    session: parsedSession,
    isGuest: guest === 'true',
    hasSeenOnboarding: onboardingSeen === 'true',
    permissionPromptsPending: permissionPrompts === 'true',
  };
}

export const saveSession = (session: Session | null) =>
  write(SESSION_KEY, session ? JSON.stringify(session) : null);
export const saveGuest = (isGuest: boolean) => write(GUEST_KEY, isGuest ? 'true' : null);
export const saveOnboardingSeen = () => write(ONBOARDING_SEEN_KEY, 'true');
export const savePermissionPromptsPending = (pending: boolean) =>
  write(PERMISSION_PROMPTS_KEY, pending ? 'true' : null);
