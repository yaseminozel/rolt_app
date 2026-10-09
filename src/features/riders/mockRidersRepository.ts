import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';

import { MATCH_FIXTURES, RIDE_FIXTURES, RIDER_FIXTURES } from './fixtures/riders';
import type { BlockedRider, RideDetail, RideSummary, Rider, RidersRepository } from './types';

const NETWORK_DELAY_MS = 400;
const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

// Mutable copies so follow / like / save survive refetches for the app session.
const riders = new Map<string, Rider>(RIDER_FIXTURES.map((rider) => [rider.id, { ...rider }]));
const rides = new Map<string, RideSummary>(RIDE_FIXTURES.map((ride) => [ride.id, { ...ride }]));
/** MOCK: the design's blocked riders (10.06 `rJ2Ce`), only known through this list. */
const BLOCKED_FIXTURES: BlockedRider[] = [
  { id: 'murat-demir', name: 'Murat Demir', handle: 'muratd' },
  { id: 'elif-kaya', name: 'Elif Kaya', handle: 'elifkaya' },
  { id: 'serkan-yildiz', name: 'Serkan Yıldız', handle: 'serkanyldz' },
];
let blocked: BlockedRider[] = [...BLOCKED_FIXTURES];
const isBlocked = (riderId: string) => blocked.some((rider) => rider.id === riderId);
/** Bookmarked ride ids, most recent first ("Kaydettiklerim"). */
let savedOrder: string[] = RIDE_FIXTURES.filter((ride) => ride.isSaved).map((ride) => ride.id);

/** A fixture ride with its rider; fixtures have a map picture but no trace. */
function rideDetail(ride: RideSummary): RideDetail | null {
  const rider = riders.get(ride.riderId);
  if (!rider || isBlocked(rider.id)) {
    return null;
  }
  const primary = rider.bikes.find((bike) => bike.isPrimary);
  return {
    ...ride,
    author: {
      id: rider.id,
      name: rider.name,
      handle: rider.handle,
      avatar: rider.avatar,
      bike: primary ? `${motorcycleBrandNames[primary.brand]} ${primary.model}` : undefined,
    },
    visibility: 'public',
    durationS: ride.durationMinutes * 60,
    maxSpeedKmh: ride.averageSpeedKmh * 1.7,
    difficulty: 'moderate',
    surface: 'asphalt',
    preview: [],
  };
}

function updateRide(rideId: string, update: (ride: RideSummary) => RideSummary) {
  const ride = rides.get(rideId);
  if (ride) {
    rides.set(rideId, update(ride));
  }
}

/** In-memory RidersRepository backed by the design fixtures. */
export const mockRidersRepository: RidersRepository = {
  async getById(id) {
    await wait();
    return isBlocked(id) ? null : (riders.get(id) ?? null);
  },

  async listRides(riderId) {
    await wait();
    return [...rides.values()]
      .filter((ride) => ride.riderId === riderId)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  },

  async getMatch(riderId) {
    await wait();
    return MATCH_FIXTURES[riderId] ?? null;
  },

  async setFollowing(riderId, following) {
    await wait();
    const rider = riders.get(riderId);
    if (rider && rider.isFollowing !== following) {
      riders.set(riderId, {
        ...rider,
        isFollowing: following,
        followerCount: rider.followerCount + (following ? 1 : -1),
      });
    }
  },

  async setRideLiked(rideId, liked) {
    await wait();
    updateRide(rideId, (ride) =>
      ride.isLiked === liked
        ? ride
        : { ...ride, isLiked: liked, likeCount: ride.likeCount + (liked ? 1 : -1) },
    );
  },

  async setRideSaved(rideId, saved) {
    await wait();
    updateRide(rideId, (ride) =>
      ride.isSaved === saved
        ? ride
        : { ...ride, isSaved: saved, saveCount: ride.saveCount + (saved ? 1 : -1) },
    );
    savedOrder = [...(saved ? [rideId] : []), ...savedOrder.filter((id) => id !== rideId)];
  },

  async getRide(rideId) {
    await wait();
    const ride = rides.get(rideId);
    return ride ? rideDetail(ride) : null;
  },

  async listSavedRides() {
    await wait();
    return savedOrder
      .map((id) => rides.get(id))
      .map((ride) => (ride ? rideDetail(ride) : null))
      .filter((ride): ride is RideDetail => ride !== null);
  },

  async report() {
    await wait();
  },

  async block(riderId) {
    await wait();
    const rider = riders.get(riderId);
    if (rider && !isBlocked(riderId)) {
      blocked = [
        { id: rider.id, name: rider.name, handle: rider.handle, avatar: rider.avatar },
        ...blocked,
      ];
    }
  },

  async listBlocked() {
    await wait();
    return [...blocked];
  },

  async unblock(riderId) {
    await wait();
    blocked = blocked.filter((rider) => rider.id !== riderId);
  },
};
