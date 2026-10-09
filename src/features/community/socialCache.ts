import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type { RideDetail, RideSummary, Rider } from '@/features/riders/types';

import type { CommunityPost, SearchResult } from './types';

/**
 * Cache helpers shared by the community and rider queries, so a follow, like or comment shows
 * the same everywhere: feed posts, the post sheet, search results, rider profiles, ride lists,
 * a ride's detail and the saved rides.
 * The prefixes match `communityKeys` and `riderKeys`.
 */
export const socialPrefixes = {
  feed: ['community', 'feed'],
  post: ['community', 'post'],
  comments: ['community', 'comments'],
  suggest: ['community', 'suggest'],
  search: ['community', 'search'],
  rider: ['riders', 'detail'],
  rides: ['riders', 'rides'],
  ride: ['riders', 'ride'],
  savedRides: ['riders', 'savedRides'],
} as const satisfies Record<string, QueryKey>;

type Prefix = (typeof socialPrefixes)[keyof typeof socialPrefixes];
export type CacheSnapshot = [QueryKey, unknown][];

/** Stops in-flight reads (they would overwrite an optimistic patch) and snapshots for rollback. */
export async function snapshotQueries(
  queryClient: QueryClient,
  prefixes: readonly Prefix[],
): Promise<CacheSnapshot> {
  await Promise.all(prefixes.map((queryKey) => queryClient.cancelQueries({ queryKey })));
  return prefixes.flatMap((queryKey) => queryClient.getQueriesData({ queryKey }));
}

export function restoreQueries(queryClient: QueryClient, snapshot: CacheSnapshot | undefined) {
  snapshot?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
}

/**
 * Marks the patched lists stale without refetching every loaded feed page at once; the detail
 * queries (rider, post) refetch right away for exact counts.
 */
export function settleQueries(queryClient: QueryClient, prefixes: readonly Prefix[]) {
  prefixes.forEach((queryKey) => {
    const isList =
      queryKey === socialPrefixes.feed ||
      queryKey === socialPrefixes.rides ||
      queryKey === socialPrefixes.savedRides;
    queryClient.invalidateQueries({ queryKey, refetchType: isList ? 'none' : 'active' });
  });
}

/** Applies `update` to a post wherever it is cached (feed lists and the post sheet). */
export function patchPosts(
  queryClient: QueryClient,
  match: (post: CommunityPost) => boolean,
  update: (post: CommunityPost) => CommunityPost,
) {
  queryClient.setQueriesData<CommunityPost[]>({ queryKey: socialPrefixes.feed }, (posts) =>
    posts?.map((post) => (match(post) ? update(post) : post)),
  );
  queryClient.setQueriesData<CommunityPost | null>({ queryKey: socialPrefixes.post }, (post) =>
    post && match(post) ? update(post) : post,
  );
}

/**
 * Applies `update` to a ride wherever it is cached: every loaded "Sürüşler" list, its detail
 * and the saved rides.
 */
export function patchRides(
  queryClient: QueryClient,
  rideId: string,
  update: <T extends RideSummary>(ride: T) => T,
) {
  queryClient.setQueriesData<RideSummary[]>({ queryKey: socialPrefixes.rides }, (rides) =>
    rides?.map((ride) => (ride.id === rideId ? update(ride) : ride)),
  );
  queryClient.setQueriesData<RideDetail[]>({ queryKey: socialPrefixes.savedRides }, (rides) =>
    rides?.map((ride) => (ride.id === rideId ? update(ride) : ride)),
  );
  queryClient.setQueriesData<RideDetail | null>({ queryKey: [...socialPrefixes.ride, rideId] }, (ride) =>
    ride ? update(ride) : ride,
  );
}

/** Takes an unsaved ride out of "Kaydettiklerim" (undo saves it again and refetches the list). */
export function dropSavedRide(queryClient: QueryClient, rideId: string) {
  queryClient.setQueriesData<RideDetail[]>({ queryKey: socialPrefixes.savedRides }, (rides) =>
    rides?.filter((ride) => ride.id !== rideId),
  );
}

/** Prefixes a ride like or save touches (for snapshots and settling). */
export const rideSocialPrefixes: readonly Prefix[] = [
  socialPrefixes.rides,
  socialPrefixes.ride,
  socialPrefixes.savedRides,
];

/** Follow state of one rider: profile button and count, feed "+" badges, search rows. */
export function patchFollow(queryClient: QueryClient, riderId: string, following: boolean) {
  queryClient.setQueriesData<Rider | null>(
    { queryKey: [...socialPrefixes.rider, riderId] },
    (rider) =>
      rider && rider.isFollowing !== following
        ? {
            ...rider,
            isFollowing: following,
            followerCount: Math.max(rider.followerCount + (following ? 1 : -1), 0),
          }
        : rider,
  );
  patchPosts(
    queryClient,
    (post) => post.author.id === riderId,
    (post) => ({ ...post, isFollowingAuthor: following }),
  );
  for (const queryKey of [socialPrefixes.search, socialPrefixes.suggest]) {
    queryClient.setQueriesData<SearchResult[]>({ queryKey }, (results) =>
      results?.map((result) =>
        result.kind === 'rider' && result.id === riderId ? { ...result, isFollowing: following } : result,
      ),
    );
  }
}

/** Prefixes a follow touches (for snapshots and settling). */
export const followPrefixes: readonly Prefix[] = [
  socialPrefixes.rider,
  socialPrefixes.feed,
  socialPrefixes.post,
  socialPrefixes.search,
  socialPrefixes.suggest,
];

/** After a block (or unblock) the rider's posts, rides and comments change everywhere. */
export function refreshAfterBlock(queryClient: QueryClient, riderId: string) {
  queryClient.removeQueries({ queryKey: [...socialPrefixes.rider, riderId] });
  queryClient.removeQueries({ queryKey: [...socialPrefixes.rides, riderId] });
  queryClient.invalidateQueries({ queryKey: socialPrefixes.ride });
  queryClient.invalidateQueries({ queryKey: socialPrefixes.savedRides });
  patchPostsRemoved(queryClient, riderId);
  queryClient.invalidateQueries({ queryKey: ['community'] });
}

function patchPostsRemoved(queryClient: QueryClient, authorId: string) {
  queryClient.setQueriesData<CommunityPost[]>({ queryKey: socialPrefixes.feed }, (posts) =>
    posts?.filter((post) => post.author.id !== authorId),
  );
}
