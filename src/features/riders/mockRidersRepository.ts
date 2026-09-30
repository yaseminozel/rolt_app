import { MATCH_FIXTURES, RIDE_FIXTURES, RIDER_FIXTURES } from './fixtures/riders';
import type { RideSummary, Rider, RidersRepository } from './types';

const NETWORK_DELAY_MS = 400;
const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

// Mutable copies so follow / like / save survive refetches for the app session.
const riders = new Map<string, Rider>(RIDER_FIXTURES.map((rider) => [rider.id, { ...rider }]));
const rides = new Map<string, RideSummary>(RIDE_FIXTURES.map((ride) => [ride.id, { ...ride }]));
const blockedRiderIds = new Set<string>();

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
    return blockedRiderIds.has(id) ? null : (riders.get(id) ?? null);
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
      ride.isLiked === liked ? ride : { ...ride, isLiked: liked, likeCount: ride.likeCount + (liked ? 1 : -1) },
    );
  },

  async setRideSaved(rideId, saved) {
    await wait();
    updateRide(rideId, (ride) =>
      ride.isSaved === saved ? ride : { ...ride, isSaved: saved, saveCount: ride.saveCount + (saved ? 1 : -1) },
    );
  },

  async report() {
    await wait();
  },

  async block(riderId) {
    await wait();
    blockedRiderIds.add(riderId);
  },
};
