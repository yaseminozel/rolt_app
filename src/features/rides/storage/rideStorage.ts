import type { TrackPoint } from '../rideRecorder';
import type { RideRecord, RideStatus } from '../types';

export interface RideStorage {
  /**
   * Writes a whole ride. A ride that is no longer `recording` keeps its track in the record, so
   * its appended points are dropped.
   */
  put(ride: RideRecord): Promise<void>;
  /**
   * While recording (P0, every few seconds): the record without its track plus only the points
   * recorded since the last call, so a write stays small however long the ride gets.
   */
  appendRecording(ride: RideRecord, points: TrackPoint[]): Promise<void>;
  /** Rewrites a recording's points from scratch (an interrupted ride being continued). */
  replaceRecording(ride: RideRecord, points: TrackPoint[]): Promise<void>;
  /** A `recording` ride comes back with its track rebuilt from the appended points. */
  get(id: string): Promise<RideRecord | null>;
  /** Newest first. */
  list(status: RideStatus): Promise<RideRecord[]>;
  remove(id: string): Promise<void>;
  /** Small device-only settings of the record flow, e.g. the last visibility choice. */
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;
}
