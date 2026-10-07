import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { ownProfileRepository } from './ownProfileRepository';
import type { OwnProfile } from './types';

export const ownProfileKeys = {
  all: ['ownProfile'] as const,
  detail: (userId: string) => [...ownProfileKeys.all, userId] as const,
};

/** The signed-in rider's profile; disabled for guests. */
export function useOwnProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ownProfileKeys.detail(session?.userId ?? ''),
    queryFn: () => ownProfileRepository.get(session!),
    enabled: Boolean(session),
  });
}

export function useUpdateOwnProfile() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<OwnProfile>) => ownProfileRepository.update(session!, patch),
    onSuccess: (profile) =>
      queryClient.setQueryData(ownProfileKeys.detail(profile.userId), profile),
  });
}
