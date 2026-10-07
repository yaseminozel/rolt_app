import * as SQLite from 'expo-sqlite';

import type { RideRecord } from '../types';
import type { RideStorage } from './rideStorage';

const DATABASE_NAME = 'rolt-rides.db';

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
      CREATE TABLE IF NOT EXISTS ride_preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    return db;
  });
  return database;
}

/** One row per ride; the record is stored as JSON, status and start time are columns for lookups. */
export const rideStorage: RideStorage = {
  async put(ride) {
    const db = await open();
    await db.runAsync(
      'INSERT OR REPLACE INTO rides (id, status, started_at, data) VALUES (?, ?, ?, ?)',
      ride.id,
      ride.status,
      ride.startedAt,
      JSON.stringify(ride),
    );
  },
  async get(id) {
    const db = await open();
    const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM rides WHERE id = ?', id);
    return row ? (JSON.parse(row.data) as RideRecord) : null;
  },
  async list(status) {
    const db = await open();
    const rows = await db.getAllAsync<{ data: string }>(
      'SELECT data FROM rides WHERE status = ? ORDER BY started_at DESC',
      status,
    );
    return rows.map((row) => JSON.parse(row.data) as RideRecord);
  },
  async remove(id) {
    const db = await open();
    await db.runAsync('DELETE FROM rides WHERE id = ?', id);
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
