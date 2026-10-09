import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { routesRepository } from '@/features/routes/queries';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  dropSavedRide,
  followPrefixes,
  patchFollow,
  patchRides,
  refreshAfterBlock,
  restoreQueries,
  rideSocialPrefixes,
  settleQueries,
  snapshotQueries,
  socialPrefixes,
} from '@/features/community/socialCache';
import { hasSupabase } from '@/lib/supabase/client';

import { mockRidersRepository } from './mockRidersRepository';
import { supabaseRidersRepository } from './supabaseRidersRepository';
import type { BlockedRider, ReportTarget, RidersRepository } from './types';

/** Supabase when configured, otherwise the design fixtures; screens only use the hooks below. */
export const ridersRepository: RidersRepository = hasSupabase
  ? supabaseRidersRepository
  : mockRidersRepository;

/** Profiles and ride lists refresh on focus and after own actions; 30 s avoids back-and-forth reloads. */
const STALE_MS = 30_000;

export const riderKeys = {
  blocked: () => ['riders', 'blocked'] as const,
  all: ['riders'] as const,
  detail: (id: string) => ['riders', 'detail', id] as const,
  rides: (id: string) => ['riders', 'rides', id] as const,
  /** One ride's detail (`socialPrefixes.ride`); the viewer is part of the key (`isLiked`, access). */
  ride: (id: string, viewerId: string | null) => ['riders', 'ride', id, viewerId] as const,
  savedRides: (viewerId: string | null) => ['riders', 'savedRides', viewerId] as const,
  routes: (id: string) => ['riders', 'routes', id] as const,
  match: (id: string) => ['riders', 'match', id] as const,
};

export function useRider(id: string | undefined) {
  return useQuery({
    queryKey: riderKeys.detail(id ?? ''),
    queryFn: () => ridersRepository.getById(id ?? ''),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  });
}

/** "Sürüşler" feed, newest first. */
export function useRiderRides(id: string | undefined) {
  return useQuery({
    queryKey: riderKeys.rides(id ?? ''),
    queryFn: () => ridersRepository.listRides(id ?? ''),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  });
}

/**
 * A ride that isn't on this device (another rider's, a shared link, a saved ride), or the
 * server's copy of an own uploaded ride for its likes and comments. `null` when it doesn't exist
 * or the viewer may not see it.
 */
export function useRideDetail(id: string | undefined, { enabled = true }: { enabled?: boolean } = {}) {
  const viewerId = useAuth().session?.userId ?? null;
  return useQuery({
    queryKey: riderKeys.ride(id ?? '', viewerId),
    queryFn: () => ridersRepository.getRide(id ?? ''),
    enabled: Boolean(id) && enabled,
    staleTime: STALE_MS,
  });
}

/** "Kaydettiklerim" rides, most recently saved first; signed-in viewers only. */
export function useSavedRideList() {
  const viewerId = useAuth().session?.userId ?? null;
  return useQuery({
    queryKey: riderKeys.savedRides(viewerId),
    queryFn: () => ridersRepository.listSavedRides(),
    enabled: viewerId !== null,
    staleTime: STALE_MS,
  });
}

/** "Rotalar" tab: routes the rider published, newest first (routes repository, by author). */
export function useRiderRoutes(id: string | undefined) {
  return useQuery({
    queryKey: riderKeys.routes(id ?? ''),
    queryFn: () => routesRepository.listByAuthor(id ?? ''),
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

/**
 * Follow / unfollow with an optimistic follower count; the rider's posts and search rows follow
 * along, and everything rolls back if the write fails. Callers gate it behind
 * `useRequireAccount('followRider', …)`; mutations still run if the screen unmounted while a
 * guest was signing in.
 */
export function useSetFollowing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ riderId, following }: { riderId: string; following: boolean }) =>
      ridersRepository.setFollowing(riderId, following),
    onMutate: async ({ riderId, following }) => {
      const snapshot = await snapshotQueries(queryClient, followPrefixes);
      patchFollow(queryClient, riderId, following);
      return { snapshot };
    },
    onError: (_error, _variables, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: () => settleQueries(queryClient, followPrefixes),
  });
}

/** Like / unlike a ride with an optimistic count; rolls back if the write fails. */
export function useSetRideLiked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, liked }: { rideId: string; liked: boolean }) =>
      ridersRepository.setRideLiked(rideId, liked),
    onMutate: async ({ rideId, liked }) => {
      const snapshot = await snapshotQueries(queryClient, rideSocialPrefixes);
      patchRides(queryClient, rideId, (ride) =>
        ride.isLiked === liked
          ? ride
          : { ...ride, isLiked: liked, likeCount: Math.max(ride.likeCount + (liked ? 1 : -1), 0) },
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: () => settleQueries(queryClient, rideSocialPrefixes),
  });
}

/**
 * Bookmark / unbookmark a ride with an optimistic count; an unsaved ride leaves "Kaydettiklerim"
 * at once. Rolls back if the write fails.
 */
export function useSetRideSaved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, saved }: { rideId: string; saved: boolean }) =>
      ridersRepository.setRideSaved(rideId, saved),
    onMutate: async ({ rideId, saved }) => {
      const snapshot = await snapshotQueries(queryClient, rideSocialPrefixes);
      patchRides(queryClient, rideId, (ride) =>
        ride.isSaved === saved
          ? ride
          : { ...ride, isSaved: saved, saveCount: Math.max(ride.saveCount + (saved ? 1 : -1), 0) },
      );
      if (!saved) {
        dropSavedRide(queryClient, rideId);
      }
      return { snapshot };
    },
    onError: (_error, _variables, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: (_data, _error, { saved }) => {
      settleQueries(queryClient, rideSocialPrefixes);
      // A new bookmark has to be read to appear in the list.
      if (saved) {
        queryClient.invalidateQueries({ queryKey: socialPrefixes.savedRides });
      }
    },
  });
}

/** Report a rider or a ride; moderation happens server-side. */
export function useReport() {
  return useMutation({ mutationFn: (target: ReportTarget) => ridersRepository.report(target) });
}

/**
 * Blocking hides the profile (the rider query resolves to `null` afterwards) and the rider's
 * posts, rides and comments both ways.
 */
export function useBlockRider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (riderId: string) => ridersRepository.block(riderId),
    onSuccess: (_data, riderId) => {
      refreshAfterBlock(queryClient, riderId);
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
      refreshAfterBlock(queryClient, riderId);
    },
  });
}
