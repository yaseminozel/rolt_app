import { requireUserId, supabase, unwrap } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/database.types';
import { imageSource } from '@/lib/supabase/storage';

import type {
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  MessagesPage,
  MessagesRepository,
} from './types';

export type MessageRow = Database['public']['Tables']['messages']['Row'];

const PAGE_SIZE = 30;
const MESSAGE_COLUMNS =
  'id, conversation_id, sender_id, body, attachments, created_at, edited_at, deleted_at';

/** `list_conversations()` JSON (camelCase, storage paths). */
type ConversationJson = {
  id: string;
  isGroup: boolean;
  title: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  muted: boolean;
  unreadCount: number;
  members: {
    id: string;
    name: string;
    handle: string;
    avatarPath: string | null;
    isOfficial: boolean;
    bike: string | null;
  }[];
};

function memberFromJson(json: ConversationJson['members'][number]): ConversationMember {
  return {
    id: json.id,
    name: json.name,
    handle: json.handle,
    avatar: imageSource('avatars', json.avatarPath, 'thumb'),
    isOfficial: json.isOfficial,
    bike: json.bike ?? undefined,
  };
}

function conversationFromJson(json: ConversationJson): Conversation {
  return {
    id: json.id,
    isGroup: json.isGroup,
    title: json.title ?? undefined,
    lastMessageAt: json.lastMessageAt ?? undefined,
    lastMessagePreview: json.lastMessagePreview ?? undefined,
    muted: json.muted,
    unreadCount: json.unreadCount,
    members: (json.members ?? []).map(memberFromJson),
  };
}

function attachmentsFrom(value: unknown): MessageAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is MessageAttachment =>
      typeof item === 'object' &&
      item !== null &&
      ((item.type === 'photo' && typeof item.path === 'string') ||
        ((item.type === 'ride' || item.type === 'route') && typeof item.id === 'string')),
  );
}

/** A `messages` row (REST or Realtime payload) as the app's message, relative to the viewer. */
export function messageFromRow(
  row: Pick<
    MessageRow,
    'id' | 'conversation_id' | 'sender_id' | 'body' | 'attachments' | 'created_at' | 'edited_at' | 'deleted_at'
  >,
  viewerId: string,
): Message {
  const deleted = row.deleted_at !== null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    mine: row.sender_id === viewerId,
    body: deleted ? undefined : (row.body ?? undefined),
    attachments: deleted ? [] : attachmentsFrom(row.attachments),
    createdAt: row.created_at,
    editedAt: row.edited_at ?? undefined,
    deleted,
  };
}

/**
 * Messages on the self-hosted Supabase. RLS: only members read a conversation; sending needs a
 * verified account and no block between the members; the inbox and new conversations go through
 * definer RPCs (`list_conversations`, `start_direct_conversation`).
 */
export const supabaseMessagesRepository: MessagesRepository = {
  async listConversations() {
    await requireUserId();
    const rows = unwrap(await supabase.rpc('list_conversations')) ?? [];
    return (rows as unknown as ConversationJson[]).map(conversationFromJson);
  },

  async listMessages(conversationId, { before, limit = PAGE_SIZE } = {}) {
    const viewerId = await requireUserId();
    let query = supabase
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (before) {
      query = query.lt('created_at', before);
    }
    const rows = unwrap(await query) ?? [];
    const messages = rows.map((row) => messageFromRow(row, viewerId));
    const page: MessagesPage = {
      messages,
      nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt : null,
    };
    return page;
  },

  async send(conversationId, { body, attachments = [] }) {
    const viewerId = await requireUserId();
    const row = unwrap(
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          body: body?.trim() || null,
          attachments: attachments as unknown as Json,
        })
        .select(MESSAGE_COLUMNS)
        .single(),
    );
    if (!row) {
      throw new Error('Message not stored');
    }
    return messageFromRow(row, viewerId);
  },

  async markRead(conversationId, upTo = new Date().toISOString()) {
    const viewerId = await requireUserId();
    unwrap(
      await supabase
        .from('conversation_members')
        .update({ last_read_at: upTo })
        .eq('conversation_id', conversationId)
        .eq('user_id', viewerId)
        // Never moves the read mark back (an older page read after a newer one).
        .or(`last_read_at.is.null,last_read_at.lt."${upTo}"`),
    );
    unwrap(
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('kind', 'message')
        .is('read_at', null),
    );
  },

  async startDirectConversation(otherRiderId) {
    await requireUserId();
    const id = unwrap(await supabase.rpc('start_direct_conversation', { p_other: otherRiderId }));
    if (!id) {
      throw new Error('Conversation not started');
    }
    return id;
  },
};
