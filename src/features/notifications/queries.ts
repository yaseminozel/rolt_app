import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mockNotificationsRepository } from './mockNotificationsRepository';
import type { AppNotification, NotificationsRepository } from './types';

/** Swap for the Supabase implementation later; screens only use the hooks below. */
export const notificationsRepository: NotificationsRepository = mockNotificationsRepository;

const queryKey = ['notifications'] as const;

export function useNotifications() {
  return useQuery({ queryKey, queryFn: () => notificationsRepository.list() });
}

export function useUnreadNotificationCount() {
  const { data } = useNotifications();
  return data?.filter((item) => !item.read).length ?? 0;
}

const markInCache = (items: AppNotification[] | undefined, id?: string) =>
  items?.map((item) => (id === undefined || item.id === id ? { ...item, read: true } : item));

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsRepository.markRead(id),
    onMutate: (id) =>
      queryClient.setQueryData(queryKey, (items: AppNotification[] | undefined) =>
        markInCache(items, id),
      ),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsRepository.markAllRead(),
    onMutate: () =>
      queryClient.setQueryData(queryKey, (items: AppNotification[] | undefined) =>
        markInCache(items),
      ),
  });
}
