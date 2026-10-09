import type { TrackPoint } from '../rideRecorder';
import type { RideRecord } from '../types';
import type { RideStorage } from './rideStorage';
import { segmentsFromPoints } from './trackPoints';

/**
 * Web preview only: expo-sqlite on web needs cross-origin isolation headers the dev server
 * doesn't send, so rides live in `localStorage` (memory when that is unavailable). A recording's
 * points are kept apart as on the device, so segments rebuild the same way.
 */
const KEY = 'rolt-rides';
const POINTS_KEY = 'rolt-ride-points';
const PREFERENCE_PREFIX = 'rolt-ride-preference:';
let memory: Record<string, RideRecord> = {};
let memoryPoints: Record<string, TrackPoint[]> = {};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or privacy mode: keep the in-memory copy.
  }
}

const read = () => load(KEY, memory);
const readPoints = () => load(POINTS_KEY, memoryPoints);

function write(rides: Record<string, RideRecord>) {
  memory = rides;
  save(KEY, rides);
}

function writePoints(points: Record<string, TrackPoint[]>) {
  memoryPoints = points;
  save(POINTS_KEY, points);
}

function withTrack(ride: RideRecord): RideRecord {
  const points = readPoints()[ride.id];
  return ride.status === 'recording' && points?.length
    ? { ...ride, track: segmentsFromPoints(points) }
    : ride;
}

function dropPoints(id: string) {
  const { [id]: _dropped, ...rest } = readPoints();
  writePoints(rest);
}

export const rideStorage: RideStorage = {
  async put(ride) {
    write({ ...read(), [ride.id]: ride });
    if (ride.status !== 'recording') {
      dropPoints(ride.id);
    }
  },
  async appendRecording(ride, points) {
    write({ ...read(), [ride.id]: { ...ride, track: [] } });
    const all = readPoints();
    const known = new Set((all[ride.id] ?? []).map((point) => point.seq));
    writePoints({ ...all, [ride.id]: [...(all[ride.id] ?? []), ...points.filter((point) => !known.has(point.seq))] });
  },
  async replaceRecording(ride, points) {
    write({ ...read(), [ride.id]: { ...ride, track: [] } });
    writePoints({ ...readPoints(), [ride.id]: points });
  },
  async get(id) {
    const ride = read()[id];
    return ride ? withTrack(ride) : null;
  },
  async list(status) {
    return Object.values(read())
      .filter((ride) => ride.status === status)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map(withTrack);
  },
  async remove(id) {
    const { [id]: _removed, ...rest } = read();
    write(rest);
    dropPoints(id);
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
  async ids() {
    return Object.keys(read());
  },
  async listUnsynced(ownerId) {
    return Object.values(read())
      .filter(
        (ride) => ride.status === 'saved' && ride.ownerId === ownerId && !ride.synced && !ride.syncError,
      )
      .sort((a, b) => a.startedAt - b.startedAt);
  },
  async putIfPresent(ride) {
    const rides = read();
    if (!rides[ride.id]) {
      return false;
    }
    write({ ...rides, [ride.id]: ride });
    return true;
  },
  async insertIfAbsent(ride) {
    const rides = read();
    if (rides[ride.id]) {
      return false;
    }
    write({ ...rides, [ride.id]: ride });
    return true;
  },
  async adoptUnowned(ownerId) {
    const rides = read();
    const unowned = Object.values(rides).filter((ride) => ride.status === 'saved' && !ride.ownerId);
    if (unowned.length > 0) {
      write({
        ...rides,
        ...Object.fromEntries(unowned.map((ride) => [ride.id, { ...ride, ownerId, synced: false }])),
      });
    }
    return unowned.length;
  },
  async clearSyncErrors(ownerId) {
    const rides = read();
    const refused = Object.values(rides).filter(
      (ride) => ride.status === 'saved' && ride.ownerId === ownerId && ride.syncError,
    );
    if (refused.length > 0) {
      write({
        ...rides,
        ...Object.fromEntries(refused.map(({ syncError: _error, ...ride }) => [ride.id, ride])),
      });
    }
    return refused.length;
  },
};
