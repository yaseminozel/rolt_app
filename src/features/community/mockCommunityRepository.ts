import { RIDER_FIXTURES } from '@/features/riders/fixtures/riders';
import { mockRidersRepository } from '@/features/riders/mockRidersRepository';
import { MOCK_OWN_RIDER_ID } from '@/features/riders/ownRider';
import { matchesSearch } from '@/lib/searchText';

import {
  COMMUNITY_AUTHORS,
  COMMUNITY_PLACES,
  initialComments,
  initialPosts,
} from './fixtures/posts';
import type {
  CommentTarget,
  CommunityAuthor,
  CommunityComment,
  CommunityPost,
  CommunityRepository,
  SearchResult,
} from './types';

const NETWORK_DELAY_MS = 400;
const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
const SUGGESTION_LIMIT = 4;

let posts = initialPosts();
let comments = initialComments();
/** Comments on profile rides (none in the samples). */
let rideComments: CommunityComment[] = [];

const commentsOf = (target: CommentTarget) => (target.type === 'post' ? comments : rideComments);

function setCommentsOf(target: CommentTarget, next: CommunityComment[]) {
  if (target.type === 'post') {
    comments = next;
  } else {
    rideComments = next;
  }
}

function changeCommentCount(target: CommentTarget, delta: number) {
  if (target.type === 'post') {
    posts = posts.map((post) =>
      post.id === target.id ? { ...post, commentCount: Math.max(post.commentCount + delta, 0) } : post,
    );
  }
}

/** MOCK: the viewer, as the author of new posts and comments (the sample account). */
function viewer(): CommunityAuthor {
  const rider = RIDER_FIXTURES.find((item) => item.id === MOCK_OWN_RIDER_ID)!;
  const bike = rider.bikes.find((item) => item.isPrimary);
  return {
    id: rider.id,
    name: rider.name,
    handle: rider.handle,
    avatar: rider.avatar,
    bike: bike ? `Bajaj ${bike.model}` : undefined,
  };
}

const isFollowing = (riderId: string) =>
  RIDER_FIXTURES.find((rider) => rider.id === riderId)?.isFollowing ?? false;

function searchAll(query: string): SearchResult[] {
  const riders: SearchResult[] = Object.values(COMMUNITY_AUTHORS)
    .filter((author) => matchesSearch(`${author.name} ${author.handle}`, query))
    .map((author) => ({
      kind: 'rider',
      id: author.id,
      name: author.name,
      handle: author.handle,
      bike: author.bike,
      isFollowing: isFollowing(author.id),
    }));
  // Only public posts are searchable (note `1005:39832`).
  const rides: SearchResult[] = posts
    .filter((post) => post.ride && post.audience === 'public')
    .filter((post) => matchesSearch(`${post.ride!.title} ${post.author.name}`, query))
    .map((post) => ({
      kind: 'ride',
      postId: post.id,
      title: post.ride!.title,
      authorName: post.author.name,
      distanceKm: post.ride!.distanceKm,
      durationMinutes: post.ride!.durationMinutes,
      thumbnail: post.photos[0] ?? post.ride!.mapImage,
    }));
  const places = COMMUNITY_PLACES.filter((place) => matchesSearch(place.name, query));
  return [...riders, ...rides, ...places];
}

/** In-memory CommunityRepository backed by the design samples. */
export const mockCommunityRepository: CommunityRepository = {
  async listFeed(filter) {
    await wait();
    return filter === 'following'
      ? posts.filter((post) => isFollowing(post.author.id) || post.author.id === MOCK_OWN_RIDER_ID)
      : posts;
  },

  async getPost(id) {
    await wait();
    return posts.find((post) => post.id === id) ?? null;
  },

  async createPost({ text, photoUris, ride, rideId, audience }) {
    await wait();
    const post: CommunityPost = {
      id: `post-${Date.now().toString(36)}`,
      author: viewer(),
      createdAt: new Date().toISOString(),
      text: text?.trim() || undefined,
      ride,
      rideId,
      photos: photoUris.map((uri) => ({ uri })),
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      isFollowingAuthor: true,
      audience,
    };
    posts = [post, ...posts];
    return post;
  },

  async setLiked(postId, liked) {
    await wait();
    posts = posts.map((post) =>
      post.id === postId && post.isLiked !== liked
        ? { ...post, isLiked: liked, likeCount: post.likeCount + (liked ? 1 : -1) }
        : post,
    );
  },

  async followAuthor(authorId) {
    await mockRidersRepository.setFollowing(authorId, true);
    posts = posts.map((post) =>
      post.author.id === authorId ? { ...post, isFollowingAuthor: true } : post,
    );
  },

  async listComments(target) {
    await wait();
    return commentsOf(target).filter((comment) => comment.postId === target.id);
  },

  async addComment(target, text) {
    await wait();
    const comment: CommunityComment = {
      id: `comment-${Date.now().toString(36)}`,
      postId: target.id,
      author: viewer(),
      createdAt: new Date().toISOString(),
      text: text.trim(),
    };
    setCommentsOf(target, [...commentsOf(target), comment]);
    changeCommentCount(target, 1);
    return comment;
  },

  async deleteComment(target, commentId) {
    await wait();
    setCommentsOf(
      target,
      commentsOf(target).filter((comment) => comment.id !== commentId),
    );
    changeCommentCount(target, -1);
  },

  async suggest(query) {
    await wait();
    return searchAll(query).slice(0, SUGGESTION_LIMIT);
  },

  async search(query) {
    await wait();
    return searchAll(query);
  },
};
