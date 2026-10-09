import type { Conversation, Message, MessagesRepository } from './types';

/**
 * MOCK: an in-memory inbox for builds without Supabase (Expo Go, demos). Starts empty (there is no
 * designed sample data); conversations started here have no members to show and nobody replies.
 */
const MOCK_VIEWER = 'me';
const conversations = new Map<string, Conversation & { otherId: string }>();
const messages = new Map<string, Message[]>();
let sequence = 0;

export const mockMessagesRepository: MessagesRepository = {
  async listConversations() {
    return [...conversations.values()]
      .map(({ otherId: _otherId, ...conversation }) => ({ ...conversation }))
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
  },

  async listMessages(conversationId, { before, limit = 30 } = {}) {
    const all = (messages.get(conversationId) ?? []).filter(
      (message) => !before || message.createdAt < before,
    );
    const page = all.slice(0, limit);
    return {
      messages: page,
      nextCursor: page.length === limit ? page[page.length - 1].createdAt : null,
    };
  },

  async send(conversationId, { body, attachments = [] }) {
    const message: Message = {
      id: `mock-message-${++sequence}`,
      conversationId,
      senderId: MOCK_VIEWER,
      mine: true,
      body: body?.trim() || undefined,
      attachments,
      createdAt: new Date().toISOString(),
      deleted: false,
    };
    messages.set(conversationId, [message, ...(messages.get(conversationId) ?? [])]);
    const conversation = conversations.get(conversationId);
    if (conversation) {
      conversation.lastMessageAt = message.createdAt;
      conversation.lastMessagePreview = message.body?.slice(0, 120);
    }
    return message;
  },

  async markRead(conversationId) {
    const conversation = conversations.get(conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
    }
  },

  async startDirectConversation(otherRiderId) {
    const existing = [...conversations.values()].find((item) => item.otherId === otherRiderId);
    if (existing) {
      return existing.id;
    }
    const id = `mock-conversation-${++sequence}`;
    conversations.set(id, {
      id,
      otherId: otherRiderId,
      isGroup: false,
      muted: false,
      unreadCount: 0,
      members: [],
    });
    return id;
  },
};
