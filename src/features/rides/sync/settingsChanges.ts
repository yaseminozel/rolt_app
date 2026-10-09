import { deviceStore } from '@/lib/deviceStore';
import { currentUserId, hasSupabase } from '@/lib/supabase/client';

/** Ride settings that live in `user_settings` when signed in (10.04, 10.05). */
export type RideSettingField = 'visibility' | 'endpoints';

/**
 * Local changes the server hasn't got yet. `ownerId` is the account they were made under (null:
 * unknown, e.g. a guest or an expired session offline; the next signed-in account takes them);
 * `version` lets a push tell whether another change came in meanwhile.
 */
export type RideSettingsDirty = { ownerId: string | null; fields: RideSettingField[]; version: number };

const DIRTY_KEY = 'rolt.settings.rideSettingsDirty';
/** Reading the account may refresh its token; a change on a slow network doesn't wait for it. */
const OWNER_LOOKUP_MS = 1_500;

let notify: (() => void) | null = null;

/** The sync engine listens here, so this module needs nothing from it. */
export function onRideSettingChanged(listener: () => void) {
  notify = listener;
}

export async function readRideSettingsDirty(): Promise<RideSettingsDirty | null> {
  try {
    const raw = await deviceStore.get(DIRTY_KEY);
    return raw ? (JSON.parse(raw) as RideSettingsDirty) : null;
  } catch {
    return null;
  }
}

export const clearRideSettingsDirty = () => deviceStore.remove(DIRTY_KEY);

/**
 * A rider's change to a server-backed ride setting: local value first (instant, offline), the
 * server in the background. The change is marked before the value is written, so a server read
 * running at the same time can't put the old value back.
 */
export async function changeRideSetting(field: RideSettingField, writeLocal: () => Promise<void>) {
  if (hasSupabase) {
    const [previous, ownerId] = await Promise.all([
      readRideSettingsDirty(),
      Promise.race([
        currentUserId().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), OWNER_LOOKUP_MS)),
      ]),
    ]);
    const fields = previous && previous.ownerId === ownerId ? previous.fields : [];
    const dirty: RideSettingsDirty = {
      ownerId,
      fields: fields.includes(field) ? fields : [...fields, field],
      version: (previous?.version ?? 0) + 1,
    };
    await deviceStore.set(DIRTY_KEY, JSON.stringify(dirty));
  }
  await writeLocal();
  notify?.();
}
