import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { ownProfileRepository } from './ownProfileRepository';
import type { OwnProfile, OwnProfilePatch } from './types';

export const ownProfileKeys = {
  all: ['ownProfile'] as const,
  detail: (userId: string) => [...ownProfileKeys.all, userId] as const,
};

/** Counters (followers, rides) change elsewhere; a minute is fresh enough between screens. */
const STALE_TIME_MS = 60_000;

/** The signed-in rider's profile; disabled for guests. */
export function useOwnProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ownProfileKeys.detail(session?.userId ?? ''),
    queryFn: () => ownProfileRepository.get(session!),
    enabled: Boolean(session),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Saves profile fields (09.01 camera, 09.05, Motorum). The change shows at once and is rolled
 * back if saving fails; a new photo appears from its local file while it uploads.
 */
export function useUpdateOwnProfile() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const key = ownProfileKeys.detail(session?.userId ?? '');
  return useMutation({
    mutationFn: (patch: OwnProfilePatch) => ownProfileRepository.update(session!, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OwnProfile>(key);
      if (previous) {
        queryClient.setQueryData<OwnProfile>(key, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (profile) => queryClient.setQueryData(ownProfileKeys.detail(profile.userId), profile),
  });
}
