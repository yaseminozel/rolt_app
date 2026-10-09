import { currentUserId, requireUserId, supabase, unwrap } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

import type { AppNotification, NotificationKind, NotificationsRepository } from './types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

/** The list keeps the latest ones; older notifications stay on the server. */
const LIST_LIMIT = 100;
const COLUMNS =
  'id, kind, title, body, created_at, read_at, route_id, post_id, ride_id, actor_id, conversation_id';

/** A `notifications` row (REST or Realtime payload) as the app's notification. */
export function notificationFromRow(
  row: Pick<
    NotificationRow,
    | 'id'
    | 'kind'
    | 'title'
    | 'body'
    | 'created_at'
    | 'read_at'
    | 'route_id'
    | 'post_id'
    | 'ride_id'
    | 'actor_id'
    | 'conversation_id'
  >,
): AppNotification {
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read_at !== null,
    routeId: row.route_id ?? undefined,
    postId: row.post_id ?? undefined,
    rideId: row.ride_id ?? undefined,
    actorId: row.actor_id ?? undefined,
    conversationId: row.conversation_id ?? undefined,
  };
}

/**
 * The signed-in rider's notifications (RLS: own rows only). The server writes them from triggers
 * (likes, comments, follows, messages, approved suggestions, weekly route digest); the app only
 * reads them and sets `read_at`, the one column it may update.
 */
export const supabaseNotificationsRepository: NotificationsRepository = {
  async list() {
    // The Discover bell renders for guests too: they simply have no notifications.
    if (!(await currentUserId())) {
      return [];
    }
    const rows = unwrap(
      await supabase
        .from('notifications')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT),
    );
    return (rows ?? []).map(notificationFromRow);
  },

  async markRead(id) {
    await requireUserId();
    unwrap(
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null),
    );
  },

  async markAllRead() {
    await requireUserId();
    unwrap(await supabase.rpc('mark_all_notifications_read'));
  },
};
