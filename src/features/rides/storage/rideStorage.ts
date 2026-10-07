import type { RideRecord, RideStatus } from '../types';

/** Rides on this device (SQLite on iOS / Android, `localStorage` in the web preview). */
export interface RideStorage {
  put(ride: RideRecord): Promise<void>;
  get(id: string): Promise<RideRecord | null>;
  /** Newest first. */
  list(status: RideStatus): Promise<RideRecord[]>;
  remove(id: string): Promise<void>;
  /** Small device-only settings of the record flow, e.g. the last visibility choice. */
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;
}
