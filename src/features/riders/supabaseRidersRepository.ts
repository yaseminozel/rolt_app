import type { RoadPreference } from '@/features/registration/types';
import { currentUserId, requireUserId, supabase, unwrap } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import { imageSource } from '@/lib/supabase/storage';

import {
  asObject,
  bool,
  isMotorcycleBrand,
  isUuid,
  mapRideDetail,
  mapRideSummary,
  num,
  str,
} from './supabaseMappers';
import type { BlockedRider, Rider, RiderBike, RiderMatch, RidersRepository } from './types';

/** Rides per profile request ("Sürüşler" is not paged on screen). */
const RIDES_LIMIT = 50;

const ROAD_PREFERENCES: readonly RoadPreference[] = [
  'curvyRoads',
  'coast',
  'mountainRoads',
  'city',
  'longTour',
  'offRoad',
  'weekendGetaway',
  'nightRiding',
];

function mapBike(value: Json): RiderBike | null {
  const json = asObject(value);
  const brand = str(json?.brand);
  if (!json || !isMotorcycleBrand(brand)) {
    return null;
  }
  return {
    id: str(json.id) ?? '',
    brand,
    model: str(json.model) ?? '',
    year: typeof json.year === 'number' ? json.year : undefined,
    displacementCc: typeof json.displacementCc === 'number' ? json.displacementCc : undefined,
    category: str(json.category) as RiderBike['category'],
    isPrimary: bool(json.isPrimary),
  };
}

/** `get_rider` → `Rider`. A follow request to a private account counts as following (the
 * button offers "Takibi bırak", which withdraws the request). */
function mapRider(value: Json): Rider | null {
  const json = asObject(value);
  if (!json) {
    return null;
  }
  const followStatus = str(json.followStatus);
  return {
    id: str(json.id) ?? '',
    name: str(json.name) ?? '',
    handle: str(json.handle) ?? '',
    avatar: imageSource('avatars', str(json.avatarPath), 'card'),
    bio: str(json.bio) || undefined,
    city: str(json.city) || undefined,
    bikes: (Array.isArray(json.bikes) ? json.bikes : [])
      .map(mapBike)
      .filter((bike): bike is RiderBike => bike !== null),
    followerCount: num(json.followerCount),
    followingCount: num(json.followingCount),
    isFollowing: bool(json.isFollowing) || followStatus === 'pending',
  };
}

function mapMatch(value: Json): RiderMatch | null {
  const json = asObject(value);
  const reason = str(json?.reason) as RoadPreference | undefined;
  if (!json || !reason || !ROAD_PREFERENCES.includes(reason)) {
    return null;
  }
  return {
    score: num(json.score),
    sharedRouteCount: num(json.sharedRouteCount),
    reason,
  };
}

function mapBlocked(value: Json): BlockedRider {
  const json = asObject(value) ?? {};
  return {
    id: str(json.id) ?? '',
    name: str(json.name) ?? '',
    handle: str(json.handle) ?? '',
    avatar: imageSource('avatars', str(json.avatarPath), 'thumb'),
  };
}

/**
 * Rider profiles on self-hosted Supabase: the `get_rider` / `rider_rides` / `rider_match` /
 * `get_ride` / `saved_rides` / `list_blocked` read models, and plain inserts / deletes for
 * follows, likes, saves, reports and blocks (RLS checks the viewer). Writes need a session.
 */
export const supabaseRidersRepository: RidersRepository = {
  async getById(id) {
    if (!isUuid(id)) {
      return null;
    }
    return mapRider(unwrap(await supabase.rpc('get_rider', { p_id: id })));
  },

  async listRides(riderId) {
    if (!isUuid(riderId)) {
      return [];
    }
    const rows = unwrap(
      await supabase.rpc('rider_rides', { p_rider: riderId, p_limit: RIDES_LIMIT }),
    );
    return (rows ?? []).map(mapRideSummary);
  },

  async getMatch(riderId) {
    if (!isUuid(riderId)) {
      return null;
    }
    return mapMatch(unwrap(await supabase.rpc('rider_match', { p_id: riderId })));
  },

  async setFollowing(riderId, following) {
    const userId = await requireUserId();
    if (following) {
      // Repeating a follow (or a pending request) is a no-op, not a key violation.
      unwrap(
        await supabase
          .from('follows')
          .upsert(
            { follower_id: userId, followee_id: riderId },
            { onConflict: 'follower_id,followee_id', ignoreDuplicates: true },
          ),
      );
    } else {
      unwrap(
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('followee_id', riderId),
      );
    }
  },

  async setRideLiked(rideId, liked) {
    const userId = await requireUserId();
    if (liked) {
      unwrap(
        await supabase
          .from('ride_likes')
          .upsert(
            { user_id: userId, ride_id: rideId },
            { onConflict: 'user_id,ride_id', ignoreDuplicates: true },
          ),
      );
    } else {
      unwrap(
        await supabase.from('ride_likes').delete().eq('user_id', userId).eq('ride_id', rideId),
      );
    }
  },

  async setRideSaved(rideId, saved) {
    const userId = await requireUserId();
    if (saved) {
      unwrap(
        await supabase
          .from('ride_saves')
          .upsert(
            { user_id: userId, ride_id: rideId },
            { onConflict: 'user_id,ride_id', ignoreDuplicates: true },
          ),
      );
    } else {
      unwrap(
        await supabase.from('ride_saves').delete().eq('user_id', userId).eq('ride_id', rideId),
      );
    }
  },

  // Ride ids are generated on the device (not UUIDs), so any id is looked up.
  async getRide(rideId) {
    if (!rideId) {
      return null;
    }
    const row = unwrap(await supabase.rpc('get_ride', { p_id: rideId }));
    return row ? mapRideDetail(row) : null;
  },

  async listSavedRides() {
    if (!(await currentUserId())) {
      return [];
    }
    const rows = unwrap(await supabase.rpc('saved_rides', { p_limit: RIDES_LIMIT }));
    return (rows ?? []).map(mapRideDetail);
  },

  async report(target) {
    const userId = await requireUserId();
    // Reports are write-only for the app (no returning row).
    unwrap(
      await supabase.from('reports').insert({
        reporter_id: userId,
        target_type: target.type,
        target_id: target.type === 'rider' ? target.riderId : target.rideId,
      }),
    );
  },

  async block(riderId) {
    const userId = await requireUserId();
    unwrap(
      await supabase
        .from('blocks')
        .upsert(
          { blocker_id: userId, blocked_id: riderId },
          { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
        ),
    );
  },

  async listBlocked() {
    await requireUserId();
    return (unwrap(await supabase.rpc('list_blocked')) ?? []).map(mapBlocked);
  },

  async unblock(riderId) {
    const userId = await requireUserId();
    unwrap(
      await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', riderId),
    );
  },
};
