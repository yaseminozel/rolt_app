/** Web preview: `localStorage` (memory when unavailable), same API as the native store. */
const memory = new Map<string, string>();

export const deviceStore = {
  getSync(key: string) {
    try {
      return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async get(key: string) {
    try {
      return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async set(key: string, value: string) {
    memory.set(key, value);
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Privacy mode: memory only.
    }
  },
  async remove(key: string) {
    memory.delete(key);
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Nothing stored.
    }
  },
};
