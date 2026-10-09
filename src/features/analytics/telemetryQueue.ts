import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { currentUserId, hasSupabase, supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { deviceStore } from '@/lib/deviceStore';

type TelemetryTable = 'app_events' | 'app_errors';
type InsertRow<T extends TelemetryTable> = Database['public']['Tables'][T]['Insert'];

/** A row waiting to be sent, with the account that was signed in when it happened. */
type Queued<T extends TelemetryTable> = { row: InsertRow<T>; userId: string | null };

type QueueOptions = {
  /** Device key of the backlog (survives a crash or a kill, sent on the next launch). */
  storageKey: string;
  /** Sent as soon as this many rows wait. */
  batchSize: number;
  /** Oldest rows are dropped beyond this. */
  maxBacklog: number;
};

/** Network failures in a row before the waiting batch is dropped. */
const MAX_ATTEMPTS = 5;
/** Rows sent in one insert. */
const MAX_INSERT_ROWS = 50;
const FLUSH_INTERVAL_MS = 30_000;
/** The backlog of the previous launch goes out this long after start, off the launch path. */
const STARTUP_FLUSH_DELAY_MS = 5_000;

export type TelemetryQueue<T extends TelemetryTable> = {
  enqueue: (row: InsertRow<T>) => void;
  /** Rows waiting in memory (dedupe of errors updates them in place). */
  pending: () => readonly Queued<T>[];
  /** Writes the backlog right now (fatal errors: the app may die next). */
  persistNow: () => void;
  flush: () => Promise<void>;
};

let online = true;
const queues: TelemetryQueue<TelemetryTable>[] = [];
let started = false;
let sessionUserId: string | null = null;
let watchingSession = false;

/** The signed-in account right now, synchronously (rows remember who was signed in). */
export function telemetryUserId() {
  if (!watchingSession && hasSupabase) {
    watchingSession = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      sessionUserId = session?.user.id ?? null;
    });
  }
  return sessionUserId;
}

/** Timer, background and connectivity triggers shared by the queues; idempotent. */
export function startTelemetryFlushing() {
  if (started || !hasSupabase) {
    return;
  }
  started = true;
  telemetryUserId();
  const flushAll = () => {
    for (const queue of queues) {
      queue.flush().catch(() => undefined);
    }
  };
  setTimeout(flushAll, STARTUP_FLUSH_DELAY_MS);
  setInterval(flushAll, FLUSH_INTERVAL_MS);
  AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      flushAll();
    }
  });
  NetInfo.addEventListener((state) => {
    const wasOnline = online;
    online = state.isConnected !== false;
    if (online && !wasOnline) {
      flushAll();
    }
  });
}

/**
 * In-memory queue of telemetry rows with a small backlog on the device, sent in batches with one
 * insert each. Never throws and never blocks: a batch the server refuses (bad row) is dropped at
 * once, one that keeps failing on the network after `MAX_ATTEMPTS`.
 */
export function createTelemetryQueue<T extends TelemetryTable>(
  table: T,
  { storageKey, batchSize, maxBacklog }: QueueOptions,
): TelemetryQueue<T> {
  let items: Queued<T>[] = [];
  let loaded = false;
  let flushing: Promise<void> | null = null;
  let failures = 0;

  const load = () => {
    if (loaded) {
      return;
    }
    loaded = true;
    try {
      const stored = deviceStore.getSync(storageKey);
      const backlog = stored ? (JSON.parse(stored) as Queued<T>[]) : [];
      if (Array.isArray(backlog)) {
        items = [...backlog, ...items].slice(-maxBacklog);
      }
    } catch {
      // A corrupt backlog is not worth keeping.
    }
  };

  const serialized = () => JSON.stringify(items.slice(-maxBacklog));

  const persist = () => {
    deviceStore.set(storageKey, serialized()).catch(() => undefined);
  };

  const send = async () => {
    const batch = items.slice(0, MAX_INSERT_ROWS);
    const userId = await currentUserId().catch(() => null);
    // RLS accepts only the signed-in account's id: rows from another session go without one.
    const rows = batch.map(({ row, userId: rowUserId }) => ({
      ...row,
      user_id: rowUserId !== null && rowUserId === userId ? rowUserId : null,
    }));
    // No `.select()`: clients may only insert (the rows aren't readable back).
    const { error } = await supabase.from(table).insert(rows as never);
    // Postgres itself refused the rows (5-character SQLSTATE: check or RLS violation): sending them
    // again can't help. Network, gateway and expired-token errors are retried.
    const refused = error && /^[0-9A-Z]{5}$/.test(error.code ?? '');
    if (error && !refused) {
      failures += 1;
      if (failures < MAX_ATTEMPTS) {
        return;
      }
    }
    failures = 0;
    const sent = new Set(batch);
    items = items.filter((item) => !sent.has(item));
    persist();
  };

  const flush = () => {
    if (!hasSupabase || !online || flushing) {
      return flushing ?? Promise.resolve();
    }
    load();
    if (items.length === 0) {
      return Promise.resolve();
    }
    flushing = send()
      .catch(() => {
        failures += 1;
      })
      .finally(() => {
        flushing = null;
      });
    return flushing;
  };

  const queue: TelemetryQueue<T> = {
    enqueue(row) {
      // Without Supabase (Expo Go demo, tests) there is nowhere to send them.
      if (!hasSupabase) {
        return;
      }
      load();
      items.push({ row, userId: telemetryUserId() });
      if (items.length > maxBacklog) {
        items = items.slice(-maxBacklog);
      }
      persist();
      if (items.length >= batchSize) {
        flush().catch(() => undefined);
      }
    },
    pending: () => {
      load();
      return items;
    },
    persistNow() {
      try {
        deviceStore.setSync(storageKey, serialized());
      } catch {
        // Best effort.
      }
    },
    flush,
  };
  queues.push(queue as unknown as TelemetryQueue<TelemetryTable>);
  return queue;
}
