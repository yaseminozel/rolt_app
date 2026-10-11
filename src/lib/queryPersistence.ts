import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { PersistedClient, PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { deviceStore } from '@/lib/deviceStore';

/**
 * The React Query cache kept on the device (SQLite kv-store), so the app opens with content and
 * still shows what it last loaded while offline. Only an allow-list of screens' data is kept, for
 * a day, and only for the account that wrote it: another account (or a guest) starts empty.
 */

/** Older data is dropped on restore; persisted queries stay in memory as long (`gcTime`). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'rolt.queryCache';
/** Writes at most once a second while queries settle. */
const THROTTLE_MS = 1000;
/** Auth always answers at launch; should it not, the app runs on without the stored cache. */
const OWNER_WAIT_MS = 10_000;
const GUEST = 'guest';

/**
 * Query key prefixes worth keeping: one entry per screen, not per keystroke or map pan (search,
 * suggestions, map area and reach lists are left out), and nothing local-first (rides live in
 * SQLite already).
 */
const PERSISTED_PREFIXES: readonly QueryKey[] = [
  ['routes', 'recommended'],
  ['routes', 'recommended-list'],
  ['routes', 'detail'],
  ['routes', 'byIds'],
  // `community_feed` answers one page (`FEED_LIMIT`).
  ['community', 'feed'],
  ['ownProfile'],
  ['notifications'],
  ['riders', 'detail'],
  ['riders', 'rides'],
  ['riders', 'routes'],
  ['riders', 'savedRides'],
];

const isPersisted = (queryKey: QueryKey) =>
  PERSISTED_PREFIXES.some((prefix) => prefix.every((part, index) => queryKey[index] === part));

/** Account the cache belongs to: a user id or `guest`; unknown until auth is ready. */
let owner: string | undefined;
let resolveOwner: (value: string) => void = () => undefined;
const ownerKnown = new Promise<string>((resolve) => {
  resolveOwner = resolve;
});

/** A restore result the persister treats as invalid (no timestamp): it is removed, not hydrated. */
const DISCARDED: PersistedClient = {
  timestamp: 0,
  buster: '',
  clientState: { queries: [], mutations: [] },
};

type StoredCache = { owner?: string; client?: PersistedClient };

const persister = createAsyncStoragePersister({
  key: STORAGE_KEY,
  throttleTime: THROTTLE_MS,
  storage: {
    // Restoring waits for auth, so the stored cache is checked against the signed-in account.
    getItem: async (key) => {
      const known = await Promise.race([
        ownerKnown,
        new Promise<undefined>((resolve) => setTimeout(resolve, OWNER_WAIT_MS)),
      ]);
      return known === undefined ? null : deviceStore.get(key);
    },
    setItem: (key, value) => deviceStore.set(key, value),
    removeItem: (key) => deviceStore.remove(key),
  },
  // The owner is written with the data, so a write that was in flight while the account changed
  // can never restore for the next one.
  serialize: (client) => JSON.stringify({ owner, client } satisfies StoredCache),
  deserialize: (raw) => {
    const stored = JSON.parse(raw) as StoredCache;
    return stored.owner !== undefined && stored.owner === owner && stored.client
      ? stored.client
      : DISCARDED;
  },
});

/**
 * `PersistQueryClientProvider` options. The buster drops the cache with every build and update:
 * mapped data may hold bundled asset ids (fallback covers) and shapes of the previous code.
 */
export const queryPersistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: MAX_AGE_MS,
  buster: [Constants.expoConfig?.version, Updates.runtimeVersion, Updates.updateId]
    .map((part) => part ?? '')
    .join('|'),
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === 'success' && isPersisted(query.queryKey),
    shouldDehydrateMutation: () => false,
  },
};

/** Keeps persisted queries in memory as long as they are kept on the device. */
export function applyPersistedQueryDefaults(queryClient: QueryClient) {
  for (const prefix of PERSISTED_PREFIXES) {
    queryClient.setQueryDefaults(prefix, { gcTime: MAX_AGE_MS });
  }
}

/**
 * Tells the cache whose it is (`null`: guest or signed out). The first call, once auth is ready,
 * lets the stored cache restore if this account wrote it; a later change removes the stored
 * cache (the caller clears the in-memory one right after).
 */
export function setQueryCacheOwner(userId: string | null) {
  const next = userId ?? GUEST;
  if (owner === undefined) {
    owner = next;
    resolveOwner(next);
  } else if (owner !== next) {
    owner = next;
    Promise.resolve(persister.removeClient()).catch(() => undefined);
  }
}
