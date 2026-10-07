import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deviceStore } from '@/lib/deviceStore';

/** "Bildirimler" (10.09): which pushes the rider wants. Stored on the device until the backend. */
export type NotificationPreferences = {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  productUpdates: boolean;
};

const KEY = 'rolt.settings.notifications';
/** As drawn: social pushes on, product updates off. */
const DEFAULTS: NotificationPreferences = {
  likes: true,
  comments: true,
  followers: true,
  productUpdates: false,
};
const queryKey = ['settings', 'notifications'] as const;

async function read(): Promise<NotificationPreferences> {
  const raw = await deviceStore.get(KEY);
  return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<NotificationPreferences>) } : DEFAULTS;
}

export function useNotificationPreferences() {
  return useQuery({ queryKey, queryFn: read });
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const next = { ...(await read()), ...patch };
      await deviceStore.set(KEY, JSON.stringify(next));
      return next;
    },
    // Switches move at once; the store write follows.
    onMutate: (patch) =>
      queryClient.setQueryData(queryKey, (current: NotificationPreferences | undefined) => ({
        ...(current ?? DEFAULTS),
        ...patch,
      })),
    onSuccess: (next) => queryClient.setQueryData(queryKey, next),
  });
}
