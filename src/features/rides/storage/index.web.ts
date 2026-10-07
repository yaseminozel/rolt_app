import type { RideRecord } from '../types';
import type { RideStorage } from './rideStorage';

/**
 * Web preview only: expo-sqlite on web needs cross-origin isolation headers the dev server
 * doesn't send, so rides live in `localStorage` (memory when that is unavailable).
 */
const KEY = 'rolt-rides';
const PREFERENCE_PREFIX = 'rolt-ride-preference:';
let memory: Record<string, RideRecord> = {};

function read(): Record<string, RideRecord> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, RideRecord>) : memory;
  } catch {
    return memory;
  }
}

function write(rides: Record<string, RideRecord>) {
  memory = rides;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(rides));
  } catch {
    // Quota or privacy mode: keep the in-memory copy.
  }
}

export const rideStorage: RideStorage = {
  async put(ride) {
    write({ ...read(), [ride.id]: ride });
  },
  async get(id) {
    return read()[id] ?? null;
  },
  async list(status) {
    return Object.values(read())
      .filter((ride) => ride.status === status)
      .sort((a, b) => b.startedAt - a.startedAt);
  },
  async remove(id) {
    const { [id]: _removed, ...rest } = read();
    write(rest);
  },
  async getPreference(key) {
    try {
      return globalThis.localStorage?.getItem(`${PREFERENCE_PREFIX}${key}`) ?? null;
    } catch {
      return null;
    }
  },
  async setPreference(key, value) {
    try {
      globalThis.localStorage?.setItem(`${PREFERENCE_PREFIX}${key}`, value);
    } catch {
      // Privacy mode: the preference just isn't remembered.
    }
  },
};
