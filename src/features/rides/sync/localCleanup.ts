import { deleteRidePhotoFolder, listRidePhotoFolders } from '../ridePhotoFiles';
import { rideStorage } from '../storage';
import { dropPendingDelete, readPendingDeletes } from './pendingDeletes';
import { forgetRideSyncState } from './rideSync';
import { clearRideSettingsDirty, readRideSettingsDirty } from './settingsChanges';

/**
 * Photo folders of rides no longer on the device (e.g. a copy that finished after its ride was
 * deleted). Folders are listed before the rides, so a folder of a ride created meanwhile is
 * never taken for an orphan.
 */
export async function sweepOrphanRidePhotos() {
  const folders = listRidePhotoFolders();
  if (folders.length === 0) {
    return;
  }
  const ids = new Set(await rideStorage.ids());
  folders.filter((id) => !ids.has(id)).forEach(deleteRidePhotoFolder);
}

/**
 * After the account was deleted (10.16; the server already removed its rides and files): this
 * device forgets its rides too — saved rides of the account and those saved before accounts
 * (it would have adopted them), drafts (no owner yet, recorded under it), their photo copies,
 * queued remote deletes, an unsent ride settings change and the sync's restore / retry. Nothing
 * is queued for the server. Call it once `deleteAccount` resolved.
 */
export async function forgetAccountRides(userId: string) {
  forgetRideSyncState(userId);
  const [saved, drafts] = await Promise.all([rideStorage.list('saved'), rideStorage.list('draft')]);
  const rides = [...saved.filter((ride) => !ride.ownerId || ride.ownerId === userId), ...drafts];
  for (const ride of rides) {
    await rideStorage.remove(ride.id);
    deleteRidePhotoFolder(ride.id);
  }
  for (const item of await readPendingDeletes()) {
    if (item.ownerId === userId) {
      await dropPendingDelete(item.id);
    }
  }
  const dirty = await readRideSettingsDirty();
  if (dirty && (dirty.ownerId === userId || dirty.ownerId === null)) {
    await clearRideSettingsDirty();
  }
  await sweepOrphanRidePhotos();
}
