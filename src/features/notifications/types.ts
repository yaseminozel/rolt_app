/** What a notification is about; sets its glyph and where tapping it goes (12.01). */
export type NotificationKind =
  'comment' | 'like' | 'routeSuggestion' | 'follower' | 'suggestionApproved';

/**
 * One in-app notification. Title and body arrive ready to show (the backend writes them in the
 * rider's language); `routeId` points to a route for route-related ones.
 */
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO time. */
  createdAt: string;
  read: boolean;
  routeId?: string;
};

export interface NotificationsRepository {
  /** Newest first. */
  list(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}
