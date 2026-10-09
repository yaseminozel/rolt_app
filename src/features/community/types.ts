import type { ImageSourcePropType } from 'react-native';

import type { RideType } from '@/features/rides/rideTypes';
import type { LngLat } from '@/features/routes/types';

/** Who wrote a post or comment. Names and bikes are user content. */
export type CommunityAuthor = {
  /** Rider id; opens the rider profile (13.03). */
  id: string;
  name: string;
  /** Username without "@". */
  handle: string;
  avatar?: ImageSourcePropType;
  /** Main bike line, e.g. "Yamaha MT-07". */
  bike?: string;
};

/** A shared ride or route inside a post (note `1102:18298`: "Sürüş / rota paylaşımı"). */
export type PostRide = {
  title: string;
  description?: string;
  rideType: RideType;
  distanceKm: number;
  durationMinutes: number;
  averageSpeedKmh?: number;
  /** "Viraj", the fourth metric (13.01). */
  curveCount?: number;
  /** Static map thumbnail with the ride trace. */
  mapImage?: ImageSourcePropType;
  /**
   * The shared trace (privacy-trimmed and simplified, as others see it), as line segments. Kept
   * in the stored post so the thumbnail can be drawn again (`staticTrackImage`).
   */
  preview?: LngLat[][];
};

/**
 * A community post (13.01). The four scenarios of the design note: ride / route, text only,
 * photos only, ride / route with photos — `text`, `ride` and `photos` are each optional, but a
 * post has at least one of them.
 */
export type CommunityPost = {
  id: string;
  author: CommunityAuthor;
  /** ISO date-time with offset. */
  createdAt: string;
  text?: string;
  ride?: PostRide;
  /** The shared ride's id while it still exists (opens 09.06); the card stays as posted. */
  rideId?: string;
  photos: ImageSourcePropType[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  /** Whether the viewer follows the author; otherwise a "+" badge sits on the avatar. */
  isFollowingAuthor: boolean;
  /** "Herkese açık" or followers only (composer choice). */
  audience: PostAudience;
};

export type PostAudience = 'public' | 'followers';

/** What a comment thread belongs to: a community post, or a recorded ride on a profile. */
export type CommentTarget = { type: 'post'; id: string } | { type: 'ride'; id: string };

export type CommunityComment = {
  id: string;
  /** Id of the post or ride the comment is on (see `CommentTarget`). */
  postId: string;
  author: CommunityAuthor;
  createdAt: string;
  text: string;
};

/** "Son paylaşılanlar" filter: everyone, or only riders the viewer follows. */
export type FeedFilter = 'all' | 'following';

/** Posts loaded per feed request (pull to refresh reloads them). */
export const FEED_LIMIT = 50;

/** 13.04 search tabs: "Tümü", "Sürücüler", "Sürüşler", "Konumlar". */
export type SearchKind = 'rider' | 'ride' | 'place';

export type SearchRiderResult = {
  kind: 'rider';
  id: string;
  name: string;
  handle: string;
  avatar?: ImageSourcePropType;
  bike?: string;
  isFollowing: boolean;
};

export type SearchRideResult = {
  kind: 'ride';
  /** The post the ride was shared in. */
  postId: string;
  title: string;
  authorName: string;
  distanceKm: number;
  durationMinutes: number;
  thumbnail?: ImageSourcePropType;
};

export type SearchPlaceResult = {
  kind: 'place';
  id: string;
  /** e.g. "Kaş, Antalya". */
  name: string;
  rideCount: number;
};

export type SearchResult = SearchRiderResult | SearchRideResult | SearchPlaceResult;

export type NewPost = {
  text?: string;
  photoUris: string[];
  /** One of the viewer's saved rides, shared with the post. */
  ride?: PostRide;
  /** The shared ride's id once it is uploaded (links the post to the ride). */
  rideId?: string;
  audience: PostAudience;
};

/**
 * Data access for the community feed (Akış 22). Screens use the hooks in `queries.ts`; the mock
 * serves Expo Go and builds without Supabase. The feed refreshes on pull and focus; only an open
 * comments sheet listens for new comments (Realtime).
 */
export interface CommunityRepository {
  /** Newest first, at most `FEED_LIMIT` posts. */
  listFeed(filter: FeedFilter): Promise<CommunityPost[]>;
  getPost(id: string): Promise<CommunityPost | null>;
  createPost(post: NewPost): Promise<CommunityPost>;
  setLiked(postId: string, liked: boolean): Promise<void>;
  followAuthor(authorId: string): Promise<void>;
  /** Oldest first. */
  listComments(target: CommentTarget): Promise<CommunityComment[]>;
  addComment(target: CommentTarget, text: string): Promise<CommunityComment>;
  /** Own comments, or any comment on the viewer's own post / ride. */
  deleteComment(target: CommentTarget, commentId: string): Promise<void>;
  /** Up to 4 mixed suggestions while typing (13.04 "Öneriler"). */
  suggest(query: string): Promise<SearchResult[]>;
  search(query: string): Promise<SearchResult[]>;
}
