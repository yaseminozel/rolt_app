import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { hasSupabase, supabase } from '@/lib/supabase/client';

import { mockMessagesRepository } from './mockMessagesRepository';
import { messageFromRow, supabaseMessagesRepository, type MessageRow } from './supabaseMessagesRepository';
import type { Conversation, Message, MessagesPage, MessagesRepository, NewMessage } from './types';

/**
 * Hooks for a future inbox / chat UI (no screens yet). Usage sketch:
 * - inbox: `useConversations()`, badge `useUnreadMessageCount()`
 * - "Mesaj gönder" on a rider profile: `useStartDirectConversation().mutateAsync(riderId)` → chat
 * - chat: `useMessages(id)` (newest first; `fetchNextPage` loads older), `useConversationLive(id)`
 *   while the screen is open, `useSendMessage(id)`, `useMarkConversationRead(id)` on focus and on
 *   new messages
 * All of them need an account; screens gate them with `useRequireAccount`.
 */
export const messagesRepository: MessagesRepository = hasSupabase
  ? supabaseMessagesRepository
  : mockMessagesRepository;

export const messageKeys = {
  all: ['messages'] as const,
  conversations: (userId: string | null | undefined) =>
    [...messageKeys.all, userId ?? 'guest', 'conversations'] as const,
  conversation: (userId: string | null | undefined, conversationId: string) =>
    [...messageKeys.all, userId ?? 'guest', 'conversation', conversationId] as const,
};

function useViewerId() {
  const { session } = useAuth();
  return session?.userId ?? null;
}

export function useConversations() {
  const userId = useViewerId();
  return useQuery({
    queryKey: messageKeys.conversations(userId),
    queryFn: () => messagesRepository.listConversations(),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

/** Unread messages over all conversations that aren't muted. */
export function useUnreadMessageCount() {
  const { data } = useConversations();
  return data?.reduce((sum, item) => sum + (item.muted ? 0 : item.unreadCount), 0) ?? 0;
}

type MessagesData = InfiniteData<MessagesPage, string | null>;

export function useMessages(conversationId: string | undefined) {
  const userId = useViewerId();
  return useInfiniteQuery({
    queryKey: messageKeys.conversation(userId, conversationId ?? ''),
    queryFn: ({ pageParam }) =>
      messagesRepository.listMessages(conversationId ?? '', { before: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(userId && conversationId),
  });
}

/** Puts a message at the top of the newest page, replacing one with the same id (or `replaceId`). */
function upsertMessage(
  queryClient: QueryClient,
  key: readonly unknown[],
  message: Message,
  replaceId?: string,
) {
  queryClient.setQueryData<MessagesData>(key, (data) => {
    if (!data) {
      return data;
    }
    const exists = data.pages.some((page) => page.messages.some((item) => item.id === message.id));
    const pages = data.pages.map((page, index) => {
      let items = page.messages.filter((item) => item.id !== replaceId);
      if (exists) {
        items = items.map((item) => (item.id === message.id ? message : item));
      } else if (index === 0) {
        items = [message, ...items];
      }
      return { ...page, messages: items };
    });
    return { ...data, pages };
  });
}

let optimisticSequence = 0;

/** Sends at once into the open chat (pending), replaced by the stored message or removed on error. */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const userId = useViewerId();
  const key = messageKeys.conversation(userId, conversationId);
  return useMutation({
    mutationFn: (message: NewMessage) => messagesRepository.send(conversationId, message),
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: key });
      const optimistic: Message = {
        id: `pending-${++optimisticSequence}`,
        conversationId,
        senderId: userId ?? '',
        mine: true,
        body: message.body?.trim() || undefined,
        attachments: message.attachments ?? [],
        createdAt: new Date().toISOString(),
        deleted: false,
        pending: true,
      };
      upsertMessage(queryClient, key, optimistic);
      return { optimisticId: optimistic.id };
    },
    onSuccess: (stored, _message, context) =>
      upsertMessage(queryClient, key, stored, context?.optimisticId),
    onError: (_error, _message, context) =>
      queryClient.setQueryData<MessagesData>(key, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                messages: page.messages.filter((item) => item.id !== context?.optimisticId),
              })),
            }
          : data,
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: messageKeys.conversations(userId) }),
  });
}

/** Marks a conversation read (pass the newest message's `createdAt`); the inbox count drops at once. */
export function useMarkConversationRead(conversationId: string) {
  const queryClient = useQueryClient();
  const userId = useViewerId();
  const key = messageKeys.conversations(userId);
  return useMutation({
    mutationFn: (upTo?: string) => messagesRepository.markRead(conversationId, upTo),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Conversation[]>(key);
      queryClient.setQueryData<Conversation[]>(key, (items) =>
        items?.map((item) => (item.id === conversationId ? { ...item, unreadCount: 0 } : item)),
      );
      return { previous };
    },
    onError: (_error, _upTo, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      // Its message notifications were marked read too.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Finds or starts the direct conversation with a rider; resolves to its id. */
export function useStartDirectConversation() {
  const queryClient = useQueryClient();
  const userId = useViewerId();
  return useMutation({
    mutationFn: (otherRiderId: string) => messagesRepository.startDirectConversation(otherRiderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messageKeys.conversations(userId) }),
  });
}

/**
 * While a chat is open: new messages (and edits / deletions) arrive over Realtime into the cached
 * pages, and the inbox refreshes. Own sends already in the list are replaced, not duplicated.
 */
export function useConversationLive(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useViewerId();
  useEffect(() => {
    if (!hasSupabase || !userId || !conversationId) {
      return;
    }
    const key = messageKeys.conversation(userId, conversationId);
    const filter = `conversation_id=eq.${conversationId}`;
    const apply = (row: MessageRow) => {
      upsertMessage(queryClient, key, messageFromRow(row, userId));
      queryClient.invalidateQueries({ queryKey: messageKeys.conversations(userId) });
    };
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on<MessageRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        (payload) => apply(payload.new),
      )
      .on<MessageRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter },
        (payload) => apply(payload.new),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: key });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, queryClient]);
}
