import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when `.env` points the app at the self-hosted Supabase. Without it every repository
 * falls back to its mock (Expo Go demos, tests), the same way Mapbox falls back without a token.
 */
export const hasSupabase = url.startsWith('http') && anonKey.length > 20;

export const supabaseUrl = url.replace(/\/+$/, '');
export const supabaseAnonKey = anonKey;

/**
 * The app's single Supabase client. The session lives in the SQLite key-value store (a session is
 * larger than the 2 KB `expo-secure-store` limit); the web preview uses `localStorage`.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  hasSupabase ? supabaseUrl : 'http://localhost',
  hasSupabase ? anonKey : 'missing-anon-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : Storage,
      storageKey: 'rolt.supabase.auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    realtime: { params: { eventsPerSecond: 5 } },
  },
);

// Refresh tokens only while the app is in the foreground (supabase-js guidance for React Native).
if (hasSupabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

/** The signed-in user's id, or null for guests. Reads the stored session (no network). */
export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Same as `currentUserId`, but throws for guests: for account-only repository calls. */
export async function requireUserId() {
  const id = await currentUserId();
  if (!id) {
    throw new Error('Not signed in');
  }
  return id;
}

/** Unwraps a Supabase response, throwing its error. */
export function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw Object.assign(new Error(result.error.message), { cause: result.error });
  }
  return result.data;
}
