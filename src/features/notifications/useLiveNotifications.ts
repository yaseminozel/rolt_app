import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { messageKeys } from '@/features/messages/queries';
import { syncLocaleToServer } from '@/features/settings/userSettings';
import { hasSupabase, supabase } from '@/lib/supabase/client';

import { openNotificationTarget, pushData } from './notificationTarget';
import { pushSupported, registerPushToken, setAppBadge } from './push';
import {
  markNotificationReadInCache,
  notificationKeys,
  upsertCachedNotification,
  useNotifications,
} from './queries';
import { notificationFromRow, type NotificationRow } from './supabaseNotificationsRepository';
import './setup';

/** Push responses already handled in this run (a remount must not open the same one again). */
const handledResponses = new Set<string>();

/**
 * Keeps notifications live while the app runs; mount once for the whole app (tabs layout):
 * - Realtime: new and merged notifications of the signed-in rider patch the cached list, so the
 *   bell badge and 12.01 update at once
 * - Push: registers this phone's token (again when the app returns to the foreground, e.g. after
 *   allowing notifications in the phone's settings), refreshes the list when a push arrives in the
 *   foreground and opens a tapped push (cold or warm start) like a tap in the list, marking it read
 * - The icon badge follows the unread count
 * - The server learns the interface language after sign-in
 * Everything is torn down when the rider signs out or the account changes.
 */
export function useLiveNotifications() {
  const { session } = useAuth();
  const userId = session?.userId ?? null;
  const queryClient = useQueryClient();
  const { data: notifications } = useNotifications();
  const unread = notifications?.filter((item) => !item.read).length;

  // Realtime: INSERT (new) and UPDATE (merged likes, read elsewhere) on own notifications.
  useEffect(() => {
    if (!hasSupabase || !userId) {
      return;
    }
    const listKey = notificationKeys.list(userId);
    const filter = `recipient_id=eq.${userId}`;
    const apply = (row: NotificationRow) => {
      const notification = notificationFromRow(row);
      upsertCachedNotification(queryClient, userId, notification);
      // A new message also changes the inbox (preview, unread count).
      if (notification.kind === 'message') {
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations(userId) });
      }
    };
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on<NotificationRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter },
        (payload) => apply(payload.new),
      )
      .on<NotificationRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter },
        (payload) => apply(payload.new),
      )
      .subscribe((status) => {
        // (Re)connected: catch up on whatever happened while the socket was down.
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: listKey });
        }
      });
    return () => {
      supabase.removeChannel(channel);
      // Signed out or another account: nothing of this one stays in memory.
      queryClient.removeQueries({ queryKey: listKey });
      queryClient.removeQueries({ queryKey: [...messageKeys.all, userId] });
    };
  }, [userId, queryClient]);

  // Push token and language: on sign-in / app start, and each time the app is foregrounded.
  useEffect(() => {
    if (!userId) {
      return;
    }
    syncLocaleToServer();
    registerPushToken();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        registerPushToken();
      }
    });
    return () => subscription.remove();
  }, [userId]);

  // A push in the foreground: Realtime normally got there first; refresh in case it didn't.
  useEffect(() => {
    if (!pushSupported || !userId) {
      return;
    }
    const subscription = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
    });
    return () => subscription.remove();
  }, [userId, queryClient]);

  // Tapped push: the one that launched the app (cold start), then each one while it runs. Not
  // `useLastNotificationResponse`: it throws on web, where the emitter is unavailable.
  useEffect(() => {
    if (!pushSupported) {
      return;
    }
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) {
        return;
      }
      const id = response.notification.request.identifier;
      if (
        handledResponses.has(id) ||
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        return;
      }
      handledResponses.add(id);
      Notifications.clearLastNotificationResponse();
      const target = pushData(response.notification.request.content.data);
      if (!target) {
        return;
      }
      if (target.notificationId && userId) {
        markNotificationReadInCache(queryClient, userId, target.notificationId);
      }
      openNotificationTarget(target);
    };
    handle(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, [userId, queryClient]);

  // Only once the list is loaded, so a cold start doesn't blank the badge the push set.
  useEffect(() => {
    if (!hasSupabase) {
      return;
    }
    if (!userId) {
      setAppBadge(0);
    } else if (unread !== undefined) {
      setAppBadge(unread);
    }
  }, [userId, unread]);
}
