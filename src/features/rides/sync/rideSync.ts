import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { onAfterSignIn, onBeforeSignOut } from '@/features/auth/sessionHooks';
import { currentUserId, hasSupabase } from '@/lib/supabase/client';

import { rideStorage } from '../storage';
import { dropPendingDelete, readPendingDeletes } from './pendingDeletes';
import { restoreRides } from './rideRestore';
import { syncRideSettings } from './rideSettingsSync';
import { deleteRemoteRide, markRideSyncError, uploadRide } from './rideUpload';
import { clearRideSettingsDirty, onRideSettingChanged } from './settingsChanges';
import { classifySyncError, syncErrorInfo, type SyncErrorInfo } from './syncErrors';

/** First retry after a failed pass, doubled per failure up to the cap. */
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 10 * 60_000;
/** Signing out waits this long at most for a last upload of the account's rides. */
const SIGN_OUT_FLUSH_MS = 4_000;

let running: Promise<void> | null = null;
let again = false;
let paused = false;
let requestedWhilePaused = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** The account whose rides still have to be restored (set on every sign-in, cleared when done). */
let restoreFor: string | null = null;
const listeners = new Set<() => void>();

/**
 * Cloud sync of saved rides (P0: the device copy is the truth, the server a background copy).
 * One pass, for the signed-in account only: adopt rides saved before accounts → push changed
 * ride settings or read the account's → delete rides deleted here → upload saved, unsynced rides
 * oldest first → restore the account's rides missing here (after a sign-in). Passes never run
 * side by side; a request during a pass runs one more. A failed pass retries with exponential
 * backoff; a new trigger retries at once. A failure retrying can't fix (`classifySyncError`)
 * doesn't: the ride is marked (`syncError`, shown with `useRideSyncState`) and waits for an
 * edit, a refused delete or settings push is dropped. Without Supabase nothing runs (the mock
 * keeps rides on the device).
 */
export function requestRideSync(): Promise<void> {
  if (!hasSupabase) {
    return Promise.resolve();
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (paused) {
    requestedWhilePaused = true;
    return Promise.resolve();
  }
  if (running) {
    again = true;
    return running;
  }
  running = loop().finally(() => {
    running = null;
  });
  return running;
}

/**
 * While a ride is being recorded, sync waits (CLAUDE.md "Uzun sürüş performansı": nothing heavy
 * next to the recording loop); requests made meanwhile run when it ends.
 */
export function setRideSyncPaused(value: boolean) {
  paused = value;
  if (!value && requestedWhilePaused) {
    requestedWhilePaused = false;
    requestRideSync().catch(() => undefined);
  }
}

/** Device rides or ride settings changed by a pass (synced flags, restored rides, settings). */
export function onRideSyncChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function loop() {
  do {
    again = false;
    let ok = false;
    try {
      ok = await runPass();
    } catch (error) {
      if (__DEV__) {
        console.warn('ride sync failed', error);
      }
    }
    if (ok) {
      failures = 0;
    } else if (paused) {
      // Cut short by a recording: the rest runs when it ends.
      requestedWhilePaused = true;
      return;
    } else {
      failures += 1;
      if (!again) {
        scheduleRetry();
        return;
      }
      // A trigger came in during the failed pass (e.g. the connection is back): go again now.
    }
  } while (again && !paused);
  if (again) {
    requestedWhilePaused = true;
  }
}

function scheduleRetry() {
  const delay = Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS);
  // ±20 % so many devices coming back online don't retry in step.
  const jitter = delay * (0.8 + Math.random() * 0.4);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    requestRideSync().catch(() => undefined);
  }, jitter);
}

/** One pass; resolves false when something has to be retried. */
async function runPass(): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) {
    return true;
  }
  let ok = true;
  let changed = (await rideStorage.adoptUnowned(userId)) > 0;
  /** Runs one piece; `onRefused` handles a failure retrying can't fix (no backoff for it). */
  const step = async (
    work: () => Promise<boolean | void>,
    onRefused?: (error: SyncErrorInfo) => Promise<void>,
  ) => {
    try {
      if (await work()) {
        changed = true;
      }
    } catch (error) {
      if (onRefused && classifySyncError(error) === 'permanent') {
        const info = syncErrorInfo(error);
        if (__DEV__) {
          console.warn('ride sync: refused by the server, not retried', info);
        }
        try {
          await onRefused(info);
          changed = true;
        } catch {
          ok = false;
        }
        return;
      }
      ok = false;
      if (__DEV__) {
        console.warn('ride sync step failed', error);
      }
    }
  };

  // Settings first: the server cuts shared ride ends with them (10.05). Refused values are
  // dropped, so the account's values come back on the next pass.
  await step(() => syncRideSettings(userId), () => clearRideSettingsDirty());

  for (const item of await readPendingDeletes()) {
    if (item.ownerId === userId) {
      await step(
        async () => {
          await deleteRemoteRide(item);
          await dropPendingDelete(item.id);
        },
        () => dropPendingDelete(item.id),
      );
    }
  }

  for (const ride of await rideStorage.listUnsynced(userId)) {
    if (paused || (await currentUserId()) !== userId) {
      return false;
    }
    // Photos saved without a path (failed offline, 08.07) go up first, in `uploadRide`.
    await step(
      async () => {
        changed = true;
        if (!(await uploadRide(ride, userId))) {
          // Edited during the upload: the new version goes in the next pass.
          again = true;
        }
      },
      (error) => markRideSyncError(ride, error),
    );
  }

  if (restoreFor === userId && !paused) {
    await step(async () => {
      const added = await restoreRides(userId);
      restoreFor = null;
      return added > 0;
    });
  }

  if (changed) {
    listeners.forEach((listener) => listener());
  }
  return ok;
}

let started = false;

/**
 * Starts the triggers once: app start, back to the foreground, connection regained, sign-in
 * (with a restore), sign-out (a last short upload), ride settings changed. Saves, edits and
 * deletes request a pass themselves (`ridesRepository`).
 */
export function startRideSync() {
  if (started || !hasSupabase) {
    return;
  }
  started = true;
  onRideSettingChanged(() => {
    requestRideSync().catch(() => undefined);
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      requestRideSync().catch(() => undefined);
    }
  });
  let online: boolean | null = null;
  NetInfo.addEventListener((state) => {
    const now = state.isConnected !== false && state.isInternetReachable !== false;
    if (now && online === false) {
      requestRideSync().catch(() => undefined);
    }
    online = now;
  });
  requestRideSync().catch(() => undefined);
}

// Registered when the module loads (imported by `RideRecordingProvider` in the root layout), so
// the auth layer's first `runAfterSignIn` on app start can't come before it.
onAfterSignIn(async () => {
  restoreFor = await currentUserId();
  // A ride refused under an earlier session gets one more try.
  if (restoreFor) {
    await rideStorage.clearSyncErrors(restoreFor).catch(() => 0);
  }
  requestRideSync().catch(() => undefined);
});

/**
 * The account was deleted (`forgetAccountRides`): nothing of it is restored or retried here
 * any more.
 */
export function forgetRideSyncState(userId: string) {
  if (restoreFor === userId) {
    restoreFor = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  failures = 0;
}

onBeforeSignOut(async () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  restoreFor = null;
  await Promise.race([
    requestRideSync(),
    new Promise((resolve) => setTimeout(resolve, SIGN_OUT_FLUSH_MS)),
  ]);
});
