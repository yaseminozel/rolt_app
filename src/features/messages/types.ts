import type { ImageSourcePropType } from 'react-native';

/**
 * Direct messages between riders: data layer only, no screens yet (no design). The backend
 * (migration 0007) supports one-to-one conversations now and keeps group chats possible; a new
 * message notifies the other members (notification kind `message`, push with `conversationId`).
 */

/** Another member of a conversation (never the viewer). Names are user content. */
export type ConversationMember = {
  id: string;
  name: string;
  /** Username without "@". */
  handle: string;
  avatar?: ImageSourcePropType;
  isOfficial: boolean;
  /** Main bike line, e.g. "Yamaha MT-07". */
  bike?: string;
};

/** One row of the inbox, newest activity first. */
export type Conversation = {
  id: string;
  isGroup: boolean;
  /** Only group chats have a title; a direct chat is named after its other member. */
  title?: string;
  /** ISO time of the latest message; missing for a conversation without messages yet. */
  lastMessageAt?: string;
  /** First 120 characters of the latest message. */
  lastMessagePreview?: string;
  /** Muted conversations send no notifications. */
  muted: boolean;
  /** Messages from others after the viewer's last read time. */
  unreadCount: number;
  members: ConversationMember[];
};

/** Something shared in a message: a photo (storage path) or a link to a ride / route. */
export type MessageAttachment =
  | { type: 'photo'; path: string }
  | { type: 'ride'; id: string }
  | { type: 'route'; id: string };

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  /** Sent by the viewer. */
  mine: boolean;
  /** Missing for a message that only shares attachments; empty once deleted. */
  body?: string;
  attachments: MessageAttachment[];
  /** ISO time (server clock). */
  createdAt: string;
  editedAt?: string;
  /** Deleted messages stay in place as "deleted" (the body is cleared). */
  deleted: boolean;
  /** Optimistic message still on its way to the server. */
  pending?: boolean;
};

/** A page of a conversation, newest first; `nextCursor` asks for the older ones. */
export type MessagesPage = {
  messages: Message[];
  nextCursor: string | null;
};

export type NewMessage = {
  body?: string;
  attachments?: MessageAttachment[];
};

export interface MessagesRepository {
  /** The viewer's conversations, newest activity first. */
  listConversations(): Promise<Conversation[]>;
  /** Messages older than `before` (an ISO time cursor), newest first. */
  listMessages(conversationId: string, options?: { before?: string; limit?: number }): Promise<MessagesPage>;
  send(conversationId: string, message: NewMessage): Promise<Message>;
  /**
   * Marks the conversation read up to `upTo` (the newest message seen; server time avoids clock
   * skew), and its message notifications with it.
   */
  markRead(conversationId: string, upTo?: string): Promise<void>;
  /** Finds or starts the one-to-one conversation with another rider; returns its id. */
  startDirectConversation(otherRiderId: string): Promise<string>;
}
