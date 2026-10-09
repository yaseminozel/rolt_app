import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { settingsKeys } from '@/features/settings/privacySettings';

import { rideKeys } from '../queries';
import { sweepOrphanRidePhotos } from './localCleanup';
import { onRideSyncChange, requestRideSync, setRideSyncPaused, startRideSync } from './rideSync';

/**
 * Runs the ride sync for the app (mounted once by `RideRecordingProvider` in the root layout):
 * starts its triggers, holds it while a ride is being recorded, refreshes ride and ride
 * setting queries after a pass changed something, and syncs when the account changes. On start
 * it also removes photo copies left by rides deleted meanwhile.
 */
export function useRideSync(isRecording: boolean) {
  const queryClient = useQueryClient();
  const userId = useAuth().session?.userId ?? null;

  useEffect(() => {
    startRideSync();
    sweepOrphanRidePhotos().catch(() => undefined);
    return onRideSyncChange(() => {
      // Not the start / finish names of an open ride detail (geocoded once, never changed by sync).
      queryClient.invalidateQueries({
        queryKey: rideKeys.all,
        predicate: (query) => query.queryKey[3] !== 'endpoints',
      });
      queryClient.invalidateQueries({ queryKey: settingsKeys.endpointPrivacy });
    });
  }, [queryClient]);

  useEffect(() => {
    setRideSyncPaused(isRecording);
  }, [isRecording]);

  useEffect(() => {
    if (userId) {
      requestRideSync().catch(() => undefined);
    }
  }, [userId]);
}
