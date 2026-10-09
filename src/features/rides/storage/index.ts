import * as SQLite from 'expo-sqlite';

import type { TrackPoint } from '../rideRecorder';
import type { RideRecord } from '../types';
import type { RideStorage } from './rideStorage';
import { segmentsFromPoints } from './trackPoints';

const DATABASE_NAME = 'rolt-rides.db';
/** Rows per multi-row INSERT, well under SQLite's bound-variable limit (5 per point). */
const POINTS_PER_INSERT = 150;

let database: Promise<SQLite.SQLiteDatabase> | null = null;

function open() {
  database ??= SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rides_status ON rides (status, started_at);
      CREATE TABLE IF NOT EXISTS ride_points (
        ride_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        segment INTEGER NOT NULL,
        lng REAL NOT NULL,
        lat REAL NOT NULL,
        PRIMARY KEY (ride_id, seq)
      );
      CREATE TABLE IF NOT EXISTS ride_preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    return db;
  });
  return database;
}

type Db = SQLite.SQLiteDatabase;

function writeRow(db: Db, ride: RideRecord) {
  return db.runAsync(
    'INSERT OR REPLACE INTO rides (id, status, started_at, data) VALUES (?, ?, ?, ?)',
    ride.id,
    ride.status,
    ride.startedAt,
    JSON.stringify(ride),
  );
}

async function insertPoints(db: Db, rideId: string, points: TrackPoint[]) {
  for (let start = 0; start < points.length; start += POINTS_PER_INSERT) {
    const chunk = points.slice(start, start + POINTS_PER_INSERT);
    // OR REPLACE: a retried write after a failed one doesn't trip over points it already has.
    await db.runAsync(
      `INSERT OR REPLACE INTO ride_points (ride_id, seq, segment, lng, lat) VALUES ${chunk
        .map(() => '(?, ?, ?, ?, ?)')
        .join(', ')}`,
      chunk.flatMap((point) => [rideId, point.seq, point.segment, point.coordinates[0], point.coordinates[1]]),
    );
  }
}

/**
 * A recording's track comes from its points; a recording written before points existed (or by
 * an older app version, e.g. right before an OTA update) still has it in the JSON.
 */
async function withTrack(db: Db, ride: RideRecord): Promise<RideRecord> {
  if (ride.status !== 'recording') {
    return ride;
  }
  const rows = await db.getAllAsync<{ segment: number; lng: number; lat: number }>(
    'SELECT segment, lng, lat FROM ride_points WHERE ride_id = ? ORDER BY seq',
    ride.id,
  );
  if (rows.length === 0) {
    return ride;
  }
  return { ...ride, track: segmentsFromPoints(rows.map((row) => ({ segment: row.segment, coordinates: [row.lng, row.lat] }))) };
}

/**
 * One row per ride; the record is stored as JSON, status and start time are columns for lookups.
 * While recording, the track goes point by point into `ride_points` instead (see `appendRecording`).
 */
export const rideStorage: RideStorage = {
  async put(ride) {
    const db = await open();
    await db.withTransactionAsync(async () => {
      await writeRow(db, ride);
      if (ride.status !== 'recording') {
        await db.runAsync('DELETE FROM ride_points WHERE ride_id = ?', ride.id);
      }
    });
  },
  async appendRecording(ride, points) {
    const db = await open();
    await db.withTransactionAsync(async () => {
      await writeRow(db, { ...ride, track: [] });
      await insertPoints(db, ride.id, points);
    });
  },
  async replaceRecording(ride, points) {
    const db = await open();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM ride_points WHERE ride_id = ?', ride.id);
      await writeRow(db, { ...ride, track: [] });
      await insertPoints(db, ride.id, points);
    });
  },
  async get(id) {
    const db = await open();
    const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM rides WHERE id = ?', id);
    return row ? withTrack(db, JSON.parse(row.data) as RideRecord) : null;
  },
  async list(status) {
    const db = await open();
    const rows = await db.getAllAsync<{ data: string }>(
      'SELECT data FROM rides WHERE status = ? ORDER BY started_at DESC',
      status,
    );
    return Promise.all(rows.map((row) => withTrack(db, JSON.parse(row.data) as RideRecord)));
  },
  async remove(id) {
    const db = await open();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM rides WHERE id = ?', id);
      await db.runAsync('DELETE FROM ride_points WHERE ride_id = ?', id);
    });
  },
  async getPreference(key) {
    const db = await open();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM ride_preferences WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  },
  async setPreference(key, value) {
    const db = await open();
    await db.runAsync(
      'INSERT OR REPLACE INTO ride_preferences (key, value) VALUES (?, ?)',
      key,
      value,
    );
  },
};
