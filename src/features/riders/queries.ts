import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ROUTE_FIXTURES } from '@/features/routes/fixtures/routes';

import { mockRidersRepository } from './mockRidersRepository';
import type { BlockedRider, ReportTarget, RideSummary, Rider, RidersRepository } from './types';

/** Swap for the Supabase implementation later; screens only use the hooks below. */
export const ridersRepository: RidersRepository = mockRidersRepository;

export const riderKeys = {
  blocked: () => ['riders', 'blocked'] as const,
  all: ['riders'] as const,
  detail: (id: string) => ['riders', 'detail', id] as const,
  rides: (id: string) => ['riders', 'rides', id] as const,
  routes: (id: string) => ['riders', 'routes', id] as const,
  match: (id: string) => ['riders', 'match', id] as const,
};

export function useRider(id: string | undefined) {
  return useQuery({
    queryKey: riderKeys.detail(id ?? ''),
    queryFn: () => ridersRepository.getById(id ?? ''),
    enabled: Boolean(id),
  });
}

/** "Sürüşler" feed, newest first. */
export function useRiderRides(id: string | undefined) {
  return useQuery({
    queryKey: riderKeys.rides(id ?? ''),
    queryFn: () => ridersRepository.listRides(id ?? ''),
    enabled: Boolean(id),
  });
}

/**
 * "Rotalar" tab: routes the rider published. Reads the route fixtures until the routes
 * repository can list by author (Supabase: `routes.author_id`).
 */
export function useRiderRoutes(id: string | undefined) {
  return useQuery({
    queryKey: riderKeys.routes(id ?? ''),
    queryFn: async () => ROUTE_FIXTURES.filter((route) => route.author.id === id),
    enabled: Boolean(id),
  });
}

/** "Ortak noktalar" note; `null` when there is nothing in common to show. */
export function useRiderMatch(
  id: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: riderKeys.match(id ?? ''),
    queryFn: () => ridersRepository.getMatch(id ?? ''),
    enabled: Boolean(id) && enabled,
  });
}

function patchRides(
  queryClient: QueryClient,
  rideId: string,
  patch: (ride: RideSummary) => RideSummary,
) {
  queryClient.setQueriesData<RideSummary[]>({ queryKey: ['riders', 'rides'] }, (rides) =>
    rides?.map((ride) => (ride.id === rideId ? patch(ride) : ride)),
  );
}

/**
 * Follow / unfollow with an optimistic follower count. Callers gate it behind
 * `useRequireAccount('followRider', …)`; mutations still run if the screen unmounted
 * while a guest was signing in.
 */
export function useSetFollowing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ riderId, following }: { riderId: string; following: boolean }) =>
      ridersRepository.setFollowing(riderId, following),
    onMutate: ({ riderId, following }) => {
      queryClient.setQueryData<Rider | null>(riderKeys.detail(riderId), (rider) =>
        rider && rider.isFollowing !== following
          ? {
              ...rider,
              isFollowing: following,
              followerCount: rider.followerCount + (following ? 1 : -1),
            }
          : rider,
      );
    },
    onSettled: (_data, _error, { riderId }) =>
      queryClient.invalidateQueries({ queryKey: riderKeys.detail(riderId) }),
  });
}

/** Like / unlike a ride with an optimistic count. */
export function useSetRideLiked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, liked }: { rideId: string; liked: boolean }) =>
      ridersRepository.setRideLiked(rideId, liked),
    onMutate: ({ rideId, liked }) =>
      patchRides(queryClient, rideId, (ride) =>
        ride.isLiked === liked
          ? ride
          : { ...ride, isLiked: liked, likeCount: ride.likeCount + (liked ? 1 : -1) },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['riders', 'rides'] }),
  });
}

/** Bookmark / unbookmark a ride with an optimistic count. */
export function useSetRideSaved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, saved }: { rideId: string; saved: boolean }) =>
      ridersRepository.setRideSaved(rideId, saved),
    onMutate: ({ rideId, saved }) =>
      patchRides(queryClient, rideId, (ride) =>
        ride.isSaved === saved
          ? ride
          : { ...ride, isSaved: saved, saveCount: ride.saveCount + (saved ? 1 : -1) },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['riders', 'rides'] }),
  });
}

/** Report a rider or a ride; moderation happens server-side. */
export function useReport() {
  return useMutation({ mutationFn: (target: ReportTarget) => ridersRepository.report(target) });
}

/** Blocking hides the profile: the rider query resolves to `null` afterwards. */
export function useBlockRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (riderId: string) => ridersRepository.block(riderId),
    onSuccess: (_data, riderId) => {
      queryClient.removeQueries({ queryKey: riderKeys.detail(riderId) });
      queryClient.invalidateQueries({ queryKey: riderKeys.blocked() });
    },
  });
}

export function useBlockedRiders() {
  return useQuery({ queryKey: riderKeys.blocked(), queryFn: () => ridersRepository.listBlocked() });
}

export function useUnblockRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (riderId: string) => ridersRepository.unblock(riderId),
    onSuccess: (_data, riderId) => {
      queryClient.setQueryData(riderKeys.blocked(), (current: BlockedRider[] | undefined) =>
        current?.filter((rider) => rider.id !== riderId),
      );
      queryClient.invalidateQueries({ queryKey: riderKeys.detail(riderId) });
    },
  });
}
