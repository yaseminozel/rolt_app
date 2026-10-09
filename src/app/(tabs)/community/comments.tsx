import { useLocalSearchParams } from 'expo-router';

import { CommentsSheet } from '@/components/community/CommentsSheet';
import { useCommunityPost } from '@/features/community/queries';

/** 13.02 Topluluk / Yorumlar for a community post (feed and search open it). */
export default function PostCommentsSheet() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { data: post } = useCommunityPost(postId);

  return (
    <CommentsSheet
      target={postId ? { type: 'post', id: postId } : undefined}
      subject={{
        count: post?.commentCount,
        title: post?.ride?.title || post?.author.name,
        ownerId: post?.author.id,
      }}
    />
  );
}
