import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Session } from './types';

const SESSION_KEY = 'rolt.session';
const GUEST_KEY = 'rolt.guest';
const ONBOARDING_SEEN_KEY = 'rolt.onboardingSeen';
const PERMISSION_PROMPTS_KEY = 'rolt.permissionPromptsPending';
const ALL_KEYS = [SESSION_KEY, GUEST_KEY, ONBOARDING_SEEN_KEY, PERMISSION_PROMPTS_KEY];

// Dev only: `EXPO_PUBLIC_RESET_STATE=1 npx expo start --clear` wipes the stored state on every
// app launch (and reload), so the whole flow starts again from onboarding.
const shouldResetOnLaunch = __DEV__ && process.env.EXPO_PUBLIC_RESET_STATE === '1';
let hasResetThisLaunch = false;

export type PersistedAuthState = {
  session: Session | null;
  isGuest: boolean;
  hasSeenOnboarding: boolean;
  /** True from signing in to an unfinished account until the permission sheet (03.01–03.02) is left. */
  permissionPromptsPending: boolean;
};

// expo-secure-store has no web implementation; the web preview keeps the mock session in
// localStorage so a reload doesn't sign out.
const webStorage = Platform.OS === 'web' ? globalThis.localStorage : undefined;

async function read(key: string) {
  try {
    if (webStorage) {
      return webStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null) {
  try {
    if (webStorage) {
      if (value === null) {
        webStorage.removeItem(key);
      } else {
        webStorage.setItem(key, value);
      }
      return;
    }
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
  if (shouldResetOnLaunch && !hasResetThisLaunch) {
    hasResetThisLaunch = true;
    await Promise.all(ALL_KEYS.map((key) => write(key, null)));
  }
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
/** Signing out starts the app over from onboarding (01.01). */
export const clearOnboardingSeen = () => write(ONBOARDING_SEEN_KEY, null);
export const savePermissionPromptsPending = (pending: boolean) =>
  write(PERMISSION_PROMPTS_KEY, pending ? 'true' : null);
