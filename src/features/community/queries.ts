import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mockCommunityRepository } from './mockCommunityRepository';
import type { CommunityPost, CommunityRepository, FeedFilter, NewPost } from './types';

export const communityRepository: CommunityRepository = mockCommunityRepository;

export const communityKeys = {
  all: ['community'] as const,
  feed: (filter: FeedFilter) => [...communityKeys.all, 'feed', filter] as const,
  post: (id: string) => [...communityKeys.all, 'post', id] as const,
  comments: (postId: string) => [...communityKeys.all, 'comments', postId] as const,
  suggest: (query: string) => [...communityKeys.all, 'suggest', query] as const,
  search: (query: string) => [...communityKeys.all, 'search', query] as const,
};

/** Suggestions start after this many characters (note `1005:39831`). */
export const SUGGEST_MIN_LENGTH = 2;

export function useCommunityFeed(filter: FeedFilter) {
  return useQuery({
    queryKey: communityKeys.feed(filter),
    queryFn: () => communityRepository.listFeed(filter),
  });
}

export function useCommunityPost(id: string | undefined) {
  return useQuery({
    queryKey: communityKeys.post(id ?? ''),
    queryFn: () => communityRepository.getPost(id ?? ''),
    enabled: Boolean(id),
  });
}

export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: communityKeys.comments(postId ?? ''),
    queryFn: () => communityRepository.listComments(postId ?? ''),
    enabled: Boolean(postId),
  });
}

export function useCommunitySuggestions(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: communityKeys.suggest(trimmed),
    queryFn: () => communityRepository.suggest(trimmed),
    enabled: trimmed.length >= SUGGEST_MIN_LENGTH,
  });
}

export function useCommunitySearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: communityKeys.search(trimmed),
    queryFn: () => communityRepository.search(trimmed),
    enabled: trimmed.length > 0,
  });
}

function updatePosts(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  update: (post: CommunityPost) => CommunityPost,
) {
  queryClient.setQueriesData<CommunityPost[]>({ queryKey: [...communityKeys.all, 'feed'] }, (posts) =>
    posts?.map((post) => (post.id === postId ? update(post) : post)),
  );
}

/** Like / unlike with an optimistic count. */
export function useSetPostLiked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      communityRepository.setLiked(postId, liked),
    onMutate: ({ postId, liked }) =>
      updatePosts(queryClient, postId, (post) =>
        post.isLiked === liked
          ? post
          : { ...post, isLiked: liked, likeCount: post.likeCount + (liked ? 1 : -1) },
      ),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: NewPost) => communityRepository.createPost(post),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...communityKeys.all, 'feed'] }),
  });
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => communityRepository.addComment(postId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comments(postId) });
      updatePosts(queryClient, postId, (post) => ({ ...post, commentCount: post.commentCount + 1 }));
    },
  });
}

/** "+" on a post avatar: follow the author; every post of theirs drops the badge. */
export function useFollowAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (authorId: string) => communityRepository.followAuthor(authorId),
    onMutate: (authorId) =>
      queryClient.setQueriesData<CommunityPost[]>(
        { queryKey: [...communityKeys.all, 'feed'] },
        (posts) =>
          posts?.map((post) =>
            post.author.id === authorId ? { ...post, isFollowingAuthor: true } : post,
          ),
      ),
  });
}
