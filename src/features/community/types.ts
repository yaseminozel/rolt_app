import type { ImageSourcePropType } from 'react-native';

import type { RideType } from '@/features/rides/rideTypes';

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
  /** "Yükseklik" instead of the average speed when the ride climbed (13.02 Kaş – Kalkan). */
  elevationGainM?: number;
  /** Static map thumbnail with the ride trace. */
  mapImage?: ImageSourcePropType;
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
  photos: ImageSourcePropType[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  /** "Herkese açık" or followers only (composer choice). */
  audience: PostAudience;
};

export type PostAudience = 'public' | 'followers';

export type CommunityComment = {
  id: string;
  postId: string;
  author: CommunityAuthor;
  createdAt: string;
  text: string;
};

/** "Son paylaşılanlar" filter: everyone, or only riders the viewer follows. */
export type FeedFilter = 'all' | 'following';

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
  audience: PostAudience;
};

/**
 * Data access for the community feed (Akış 22). Screens use the hooks in `queries.ts`; the mock
 * is replaced by self-hosted Supabase later (no Realtime: the feed refreshes on pull and focus).
 */
export interface CommunityRepository {
  listFeed(filter: FeedFilter): Promise<CommunityPost[]>;
  getPost(id: string): Promise<CommunityPost | null>;
  createPost(post: NewPost): Promise<CommunityPost>;
  setLiked(postId: string, liked: boolean): Promise<void>;
  listComments(postId: string): Promise<CommunityComment[]>;
  addComment(postId: string, text: string): Promise<CommunityComment>;
  /** Up to 4 mixed suggestions while typing (13.04 "Öneriler"). */
  suggest(query: string): Promise<SearchResult[]>;
  search(query: string): Promise<SearchResult[]>;
}
