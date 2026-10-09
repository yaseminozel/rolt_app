import { router } from 'expo-router';

import { averageSpeedKmh } from '@/components/ride-form/RideSummaryCard';
import { CARD_MAP_SIZE } from '@/features/riders/supabaseMappers';
import { composeIntent } from '@/features/community/composeIntent';
import type { PostRide } from '@/features/community/types';
import { readEndpointPrivacy } from '@/features/settings/privacySettings';
import { staticTrackImage } from '@/lib/staticTrackImage';

import { rideTitle } from './rideTitle';
import { rideSyncState } from './sync/useRideSyncState';
import { simplifyLine } from './trackView';
import { trimTrackEnds } from './trimTrackEnds';
import type { RideRecord } from './types';

/** Close to the server's shared preview (`private.ride_preview`, 0.00005° ≈ 5 m). */
const PREVIEW_TOLERANCE_M = 5;

/**
 * The ride as a post card (`PostRide`): the trace is what others may see — the start and finish
 * cut by the rider's 10.05 setting, as the server cuts `rides.preview_path`, and simplified —
 * never the full GPS track.
 */
export async function postRideSnapshot(ride: RideRecord): Promise<PostRide> {
  const privacy = await readEndpointPrivacy();
  const shared = privacy.hidden ? trimTrackEnds(ride.track, privacy.distanceM) : ride.track;
  const preview = shared
    .map((segment) => simplifyLine(segment, PREVIEW_TOLERANCE_M))
    .filter((segment) => segment.length >= 2);
  return {
    title: rideTitle(ride),
    rideType: ride.rideType,
    distanceKm: ride.stats.distanceM / 1000,
    durationMinutes: Math.round(ride.stats.durationS / 60),
    averageSpeedKmh: averageSpeedKmh(ride),
    curveCount: ride.stats.curveCount,
    preview: preview.length > 0 ? preview : undefined,
    mapImage: staticTrackImage(preview, CARD_MAP_SIZE),
  };
}

/**
 * "Toplulukta paylaş" (08.11, 09.03, 09.06 options): opens the Topluluk composer with the ride
 * attached. The post links the ride only once it is synced; a ride not (or no longer) up to
 * date on the server is shared as the card alone. The post's audience decides who
 * sees the card, whatever the ride's own visibility. Callers gate it behind
 * `useRequireAccount('sharePost', …)`.
 */
export async function shareRideToCommunity(ride: RideRecord) {
  const snapshot = await postRideSnapshot(ride);
  const synced = rideSyncState(ride).status === 'synced';
  composeIntent.set({ photoUris: [], ride: { snapshot, rideId: synced ? ride.id : undefined } });
  router.dismissAll();
  router.navigate('/community');
}
