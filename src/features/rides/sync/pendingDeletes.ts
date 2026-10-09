import { rideStorage } from '../storage';

/**
 * A deleted ride the server may still have: its row (if it was ever saved) and its photo folder
 * (`ride-photos/<owner>/<ride id>/`, also photos of a draft left without saving). Kept in the
 * ride preferences until done, so a delete made offline happens when the connection is back
 * and the ride isn't restored meanwhile.
 */
export type PendingRideDelete = { id: string; ownerId: string; row: boolean };

const KEY = 'pendingRemoteDeletes';
/** Changes run one after another, so an add and a removal never overwrite each other. */
let chain: Promise<unknown> = Promise.resolve();

export async function readPendingDeletes(): Promise<PendingRideDelete[]> {
  try {
    const raw = await rideStorage.getPreference(KEY);
    return raw ? (JSON.parse(raw) as PendingRideDelete[]) : [];
  } catch {
    return [];
  }
}

function change(update: (items: PendingRideDelete[]) => PendingRideDelete[]) {
  const next = chain.then(async () => {
    const items = await readPendingDeletes();
    await rideStorage.setPreference(KEY, JSON.stringify(update(items)));
  });
  chain = next.catch(() => undefined);
  return next;
}

export const addPendingDelete = (item: PendingRideDelete) =>
  change((items) => {
    const known = items.find((entry) => entry.id === item.id);
    return [
      ...items.filter((entry) => entry !== known),
      { ...item, row: item.row || Boolean(known?.row) },
    ];
  });

export const dropPendingDelete = (id: string) =>
  change((items) => items.filter((entry) => entry.id !== id));
