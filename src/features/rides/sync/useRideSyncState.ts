import { hasSupabase } from '@/lib/supabase/client';

import { useRideRecord } from '../queries';
import type { RideRecord, RideSyncError } from '../types';

/**
 * Where a device ride is with the server: `local` (not a saved, owned ride, or no backend),
 * `pending` (saved here, not up yet: "Bağlantı gelince senkronize edilecek"), `synced`, or
 * `failed` (the server refused it; it stays on the device and goes again after an edit).
 */
export type RideSyncStatus = 'local' | 'pending' | 'synced' | 'failed';

export type RideSyncState = {
  status: RideSyncStatus;
  /** Raw failure for logs / support; show `rides:sync.failed` to the rider. */
  error?: RideSyncError;
  /** Photos still waiting on this device for their upload. */
  pendingPhotos: number;
};

export function rideSyncState(ride: RideRecord | null | undefined): RideSyncState {
  if (!ride || !hasSupabase || ride.status !== 'saved' || !ride.ownerId) {
    return { status: 'local', pendingPhotos: 0 };
  }
  const pendingPhotos = ride.photos.filter((photo) => !photo.path && /^file:/.test(photo.uri)).length;
  if (ride.syncError) {
    return { status: 'failed', error: ride.syncError, pendingPhotos };
  }
  return { status: ride.synced ? 'synced' : 'pending', pendingPhotos };
}

/**
 * Sync state of a ride on this device, for 09.06 / profile ride cards. Refreshed with the ride
 * (`useRideSync` invalidates ride queries after every pass that changed something).
 */
export function useRideSyncState(rideId: string | undefined): RideSyncState {
  const { data } = useRideRecord(rideId);
  return rideSyncState(data);
}
