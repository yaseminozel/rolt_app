import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hasSupabase } from '@/lib/supabase/client';

import { mockCommunityRepository } from './mockCommunityRepository';
import {
  followPrefixes,
  patchFollow,
  patchPosts,
  patchRides,
  restoreQueries,
  rideSocialPrefixes,
  settleQueries,
  snapshotQueries,
  socialPrefixes,
} from './socialCache';
import { supabaseCommunityRepository } from './supabaseCommunityRepository';
import type {
  CommentTarget,
  CommunityComment,
  CommunityRepository,
  FeedFilter,
  NewPost,
} from './types';

export const communityRepository: CommunityRepository = hasSupabase
  ? supabaseCommunityRepository
  : mockCommunityRepository;

export const communityKeys = {
  all: ['community'] as const,
  feed: (filter: FeedFilter) => [...communityKeys.all, 'feed', filter] as const,
  post: (id: string) => [...communityKeys.all, 'post', id] as const,
  comments: (target: CommentTarget) =>
    [...communityKeys.all, 'comments', target.type, target.id] as const,
  suggest: (query: string) => [...communityKeys.all, 'suggest', query] as const,
  search: (query: string) => [...communityKeys.all, 'search', query] as const,
};

/** Suggestions start after this many characters (note `1005:39831`). */
export const SUGGEST_MIN_LENGTH = 2;
/** Feed and post data refresh on pull, focus and after own actions; 30 s avoids tab-switch reloads. */
const STALE_MS = 30_000;

export function useCommunityFeed(filter: FeedFilter) {
  return useQuery({
    queryKey: communityKeys.feed(filter),
    queryFn: () => communityRepository.listFeed(filter),
    staleTime: STALE_MS,
  });
}

export function useCommunityPost(id: string | undefined) {
  return useQuery({
    queryKey: communityKeys.post(id ?? ''),
    queryFn: () => communityRepository.getPost(id ?? ''),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  });
}

export function useComments(target: CommentTarget | undefined) {
  return useQuery({
    queryKey: communityKeys.comments(target ?? { type: 'post', id: '' }),
    queryFn: () => communityRepository.listComments(target!),
    enabled: Boolean(target?.id),
  });
}

export function useCommunitySuggestions(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: communityKeys.suggest(trimmed),
    queryFn: () => communityRepository.suggest(trimmed),
    enabled: trimmed.length >= SUGGEST_MIN_LENGTH,
    staleTime: STALE_MS,
  });
}

export function useCommunitySearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: communityKeys.search(trimmed),
    queryFn: () => communityRepository.search(trimmed),
    enabled: trimmed.length > 0,
    staleTime: STALE_MS,
  });
}

/** Like / unlike with an optimistic count; rolls back if the write fails. */
export function useSetPostLiked() {
  const queryClient = useQueryClient();
  const prefixes = [socialPrefixes.feed, socialPrefixes.post];
  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      communityRepository.setLiked(postId, liked),
    onMutate: async ({ postId, liked }) => {
      const snapshot = await snapshotQueries(queryClient, prefixes);
      patchPosts(
        queryClient,
        (post) => post.id === postId,
        (post) =>
          post.isLiked === liked
            ? post
            : { ...post, isLiked: liked, likeCount: Math.max(post.likeCount + (liked ? 1 : -1), 0) },
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: () => settleQueries(queryClient, prefixes),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: NewPost) => communityRepository.createPost(post),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: socialPrefixes.feed }),
  });
}

/** Comment count of a thread, wherever it is shown (post cards and sheet, profile ride cards). */
function changeCommentCount(
  queryClient: ReturnType<typeof useQueryClient>,
  target: CommentTarget,
  delta: number,
) {
  if (target.type === 'post') {
    patchPosts(
      queryClient,
      (post) => post.id === target.id,
      (post) => ({ ...post, commentCount: Math.max(post.commentCount + delta, 0) }),
    );
  } else {
    patchRides(queryClient, target.id, (ride) => ({
      ...ride,
      commentCount: Math.max(ride.commentCount + delta, 0),
    }));
  }
}

export function useAddComment(target: CommentTarget) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => communityRepository.addComment(target, text),
    onSuccess: (comment) => {
      const key = communityKeys.comments(target);
      // A live update may have brought the comment in already.
      const known = queryClient
        .getQueryData<CommunityComment[]>(key)
        ?.some((item) => item.id === comment.id);
      if (!known) {
        queryClient.setQueryData<CommunityComment[]>(key, (current) => [...(current ?? []), comment]);
        changeCommentCount(queryClient, target, 1);
      }
    },
  });
}

/** Removes a comment at once; puts it back if the delete fails. */
export function useDeleteComment(target: CommentTarget) {
  const queryClient = useQueryClient();
  const key = communityKeys.comments(target);
  return useMutation({
    mutationFn: (commentId: string) => communityRepository.deleteComment(target, commentId),
    onMutate: async (commentId) => {
      const snapshot = await snapshotQueries(queryClient, [
        socialPrefixes.comments,
        socialPrefixes.feed,
        socialPrefixes.post,
        ...rideSocialPrefixes,
      ]);
      queryClient.setQueryData<CommunityComment[]>(key, (current) =>
        current?.filter((comment) => comment.id !== commentId),
      );
      changeCommentCount(queryClient, target, -1);
      return { snapshot };
    },
    onError: (_error, _commentId, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * A comment someone else just wrote (Realtime insert on an open sheet): reloads the thread for
 * the author's name and photo, and counts it once.
 */
export function useOnRemoteComment(target: CommentTarget) {
  const queryClient = useQueryClient();
  return (commentId: string) => {
    const key = communityKeys.comments(target);
    const known = queryClient
      .getQueryData<CommunityComment[]>(key)
      ?.some((comment) => comment.id === commentId);
    if (!known) {
      changeCommentCount(queryClient, target, 1);
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

/**
 * "+" on a post avatar: follow the author; every post of theirs drops the badge, and their
 * profile and search rows update too. Rolls back if the write fails.
 */
export function useFollowAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (authorId: string) => communityRepository.followAuthor(authorId),
    onMutate: async (authorId) => {
      const snapshot = await snapshotQueries(queryClient, followPrefixes);
      patchFollow(queryClient, authorId, true);
      return { snapshot };
    },
    onError: (_error, _authorId, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: () => settleQueries(queryClient, followPrefixes),
  });
}

