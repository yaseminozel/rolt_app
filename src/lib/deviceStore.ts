import Storage from 'expo-sqlite/kv-store';

/**
 * Small key–value store on the device (SQLite-backed), for app data that isn't a secret and
 * isn't a ride: the own profile until Supabase, settings. Secrets stay in `expo-secure-store`.
 */
export const deviceStore = {
  get: (key: string) => Storage.getItem(key),
  /** Synchronous read, for preferences needed before the first render (language, units). */
  getSync: (key: string) => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItem(key, value),
  /** Synchronous write, for data that must be on disk before the app may die (fatal JS errors). */
  setSync: (key: string, value: string) => Storage.setItemSync(key, value),
  remove: (key: string) => Storage.removeItem(key),
};
