/**
 * What a notification is about; sets its glyph and where tapping it goes (12.01). The design draws
 * the first five; the backend also writes follow requests, direct messages and product updates.
 */
export type NotificationKind =
  | 'comment'
  | 'like'
  | 'routeSuggestion'
  | 'follower'
  | 'suggestionApproved'
  | 'followRequest'
  | 'message'
  | 'productUpdate';

/**
 * One in-app notification. Title and body arrive ready to show (the backend writes them in the
 * rider's language). The optional ids point to what it is about and decide where a tap goes
 * (`notificationTarget`): a route, a community post, a ride, the rider who caused it, a chat.
 */
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO time; merged notifications ("Ayşe ve 4 kişi daha …") move to the latest event. */
  createdAt: string;
  read: boolean;
  routeId?: string;
  postId?: string;
  rideId?: string;
  /** The (latest) rider who caused it. */
  actorId?: string;
  conversationId?: string;
};

export interface NotificationsRepository {
  /** Newest first. Guests have none. */
  list(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}
