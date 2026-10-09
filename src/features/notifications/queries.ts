import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { hasSupabase } from '@/lib/supabase/client';

import { mockNotificationsRepository } from './mockNotificationsRepository';
import { supabaseNotificationsRepository } from './supabaseNotificationsRepository';
import type { AppNotification, NotificationsRepository } from './types';

/** Supabase when `.env` points at it; the design's mock list otherwise (Expo Go, demos). */
export const notificationsRepository: NotificationsRepository = hasSupabase
  ? supabaseNotificationsRepository
  : mockNotificationsRepository;

/** Per account, so a sign-out / sign-in on the same device never shows the previous list. */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string | null | undefined) => [...notificationKeys.all, userId ?? 'guest'] as const,
};

function useListKey() {
  const { session } = useAuth();
  return notificationKeys.list(session?.userId);
}

export function useNotifications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: notificationKeys.list(session?.userId),
    queryFn: () => notificationsRepository.list(),
    // Realtime and push keep it fresh while the app runs (`useLiveNotifications`).
    staleTime: 60_000,
    // Guests have no notifications on the server; the mock shows the design's list to everyone.
    enabled: !hasSupabase || Boolean(session),
  });
}

export function useUnreadNotificationCount() {
  const { data } = useNotifications();
  return data?.filter((item) => !item.read).length ?? 0;
}

const byNewest = (a: AppNotification, b: AppNotification) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt);

/**
 * Adds or replaces one notification in the cached list (Realtime INSERT / UPDATE). Merged likes
 * come back as an UPDATE with a newer time, so the list is sorted again.
 */
export function upsertCachedNotification(
  queryClient: QueryClient,
  userId: string,
  notification: AppNotification,
) {
  queryClient.setQueryData(notificationKeys.list(userId), (items: AppNotification[] | undefined) => {
    if (!items) {
      return items;
    }
    const rest = items.filter((item) => item.id !== notification.id);
    return [notification, ...rest].sort(byNewest);
  });
}

const markInCache = (items: AppNotification[] | undefined, id?: string) =>
  items?.map((item) => (id === undefined || item.id === id ? { ...item, read: true } : item));

/** Marks one notification read in the cache at once, then on the server (rolls back on error). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const queryKey = useListKey();
  return useMutation({
    mutationFn: (id: string) => notificationsRepository.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
      queryClient.setQueryData(queryKey, markInCache(previous, id));
      return { previous };
    },
    onError: (_error, _id, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const queryKey = useListKey();
  return useMutation({
    mutationFn: () => notificationsRepository.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
      queryClient.setQueryData(queryKey, markInCache(previous));
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

/** Marks a notification read outside the list (a tapped push), keeping the cache in step. */
export async function markNotificationReadInCache(
  queryClient: QueryClient,
  userId: string | null | undefined,
  id: string,
) {
  const queryKey = notificationKeys.list(userId);
  queryClient.setQueryData(queryKey, (items: AppNotification[] | undefined) => markInCache(items, id));
  try {
    await notificationsRepository.markRead(id);
  } catch {
    queryClient.invalidateQueries({ queryKey });
  }
}
