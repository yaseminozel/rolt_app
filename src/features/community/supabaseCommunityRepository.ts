import { supabaseRidersRepository } from '@/features/riders/supabaseRidersRepository';
import {
  asObject,
  bikeLine,
  bool,
  CARD_MAP_SIZE,
  isUuid,
  mapAuthor,
  mapPreview,
  num,
  photoSources,
  str,
} from '@/features/riders/supabaseMappers';
import type { RideType } from '@/features/rides/rideTypes';
import { staticTrackImage } from '@/lib/staticTrackImage';
import { requireUserId, supabase, unwrap } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import {
  contentTypeOf,
  imageSource,
  newObjectPath,
  removeFiles,
  uploadFile,
} from '@/lib/supabase/storage';

import {
  FEED_LIMIT,
  type CommentTarget,
  type CommunityComment,
  type CommunityPost,
  type CommunityRepository,
  type PostRide,
  type SearchResult,
} from './types';

/** Search results per group (13.04); suggestions show the first four overall. */
const SEARCH_LIMIT = 20;
const SUGGESTION_LIMIT = 4;
/** Search rows draw a small square thumbnail. */
const THUMB_MAP_SIZE = { width: 96, height: 96 };

/** The stored `ride_snapshot` (a `PostRide` without the picture) → the card's ride. */
function mapPostRide(value: Json | undefined): PostRide | undefined {
  const json = asObject(value);
  if (!json) {
    return undefined;
  }
  const preview = mapPreview(json.preview);
  return {
    title: str(json.title) ?? '',
    description: str(json.description) || undefined,
    rideType: (str(json.rideType) ?? 'city') as RideType,
    distanceKm: num(json.distanceKm),
    durationMinutes: num(json.durationMinutes),
    averageSpeedKmh: typeof json.averageSpeedKmh === 'number' ? json.averageSpeedKmh : undefined,
    curveCount: typeof json.curveCount === 'number' ? json.curveCount : undefined,
    preview,
    mapImage: staticTrackImage(preview, CARD_MAP_SIZE),
  };
}

/** `post_json` → `CommunityPost`. */
function mapPost(value: Json): CommunityPost {
  const json = asObject(value) ?? {};
  return {
    id: str(json.id) ?? '',
    author: mapAuthor(json.author),
    createdAt: str(json.createdAt) ?? new Date(0).toISOString(),
    text: str(json.text) || undefined,
    ride: mapPostRide(json.ride),
    rideId: str(json.rideId),
    photos: photoSources(json.photoPaths, 'post-photos'),
    likeCount: num(json.likeCount),
    commentCount: num(json.commentCount),
    isLiked: bool(json.isLiked),
    isFollowingAuthor: bool(json.isFollowingAuthor),
    audience: str(json.audience) === 'followers' ? 'followers' : 'public',
  };
}

function mapComment(value: Json): CommunityComment {
  const json = asObject(value) ?? {};
  return {
    id: str(json.id) ?? '',
    postId: str(json.postId) ?? '',
    author: mapAuthor(json.author),
    createdAt: str(json.createdAt) ?? new Date().toISOString(),
    text: str(json.text) ?? '',
  };
}

/** `community_search` → riders, then shared rides, then places (the mock's order). */
function mapSearch(value: Json): SearchResult[] {
  const json = asObject(value) ?? {};
  const list = (key: string) => {
    const items = json[key];
    return (Array.isArray(items) ? items : []).map((item) => asObject(item) ?? {});
  };
  const riders: SearchResult[] = list('riders').map((rider) => ({
    kind: 'rider',
    id: str(rider.id) ?? '',
    name: str(rider.name) ?? '',
    handle: str(rider.handle) ?? '',
    avatar: imageSource('avatars', str(rider.avatarPath), 'thumb'),
    bike: bikeLine(rider.bike),
    isFollowing: bool(rider.isFollowing),
  }));
  const rides: SearchResult[] = list('rides').map((ride) => ({
    kind: 'ride',
    postId: str(ride.postId) ?? '',
    title: str(ride.title) ?? '',
    authorName: str(ride.authorName) ?? '',
    distanceKm: num(ride.distanceKm),
    durationMinutes: num(ride.durationMinutes),
    thumbnail:
      imageSource('post-photos', str(ride.photoPath), 'thumb') ??
      staticTrackImage(mapPreview(ride.preview), THUMB_MAP_SIZE),
  }));
  const places: SearchResult[] = list('places').map((place) => ({
    kind: 'place',
    id: str(place.id) ?? '',
    name: str(place.name) ?? '',
    rideCount: num(place.rideCount),
  }));
  return [...riders, ...rides, ...places];
}

/** What goes into `posts.ride_snapshot`: the card's data and its trace, never a picture. */
function rideSnapshot(ride: PostRide): Json {
  const { mapImage: _picture, preview, ...card } = ride;
  return JSON.parse(JSON.stringify({ ...card, ...(preview ? { preview } : {}) })) as Json;
}

const commentTable = (target: CommentTarget) =>
  target.type === 'post' ? 'post_comments' : 'ride_comments';

/**
 * Community on self-hosted Supabase: `community_feed` / `community_post` / `list_comments` /
 * `community_search` read models, `add_comment`, and plain inserts / deletes for posts, likes and
 * comments (RLS checks the viewer). Writes need a session.
 */
export const supabaseCommunityRepository: CommunityRepository = {
  async listFeed(filter) {
    const rows = unwrap(
      await supabase.rpc('community_feed', { p_filter: filter, p_limit: FEED_LIMIT }),
    );
    return (rows ?? []).map(mapPost);
  },

  async getPost(id) {
    if (!isUuid(id)) {
      return null;
    }
    const row = unwrap(await supabase.rpc('community_post', { p_id: id }));
    return row ? mapPost(row) : null;
  },

  async createPost({ text, photoUris, ride, rideId, audience }) {
    const userId = await requireUserId();
    // Photos first: the row only stores paths, and RLS wants them in the author's folder.
    const photoPaths = await Promise.all(
      photoUris.map((uri) => {
        const contentType = contentTypeOf(uri);
        return uploadFile('post-photos', newObjectPath(userId, contentType), uri, { contentType });
      }),
    );
    try {
      const inserted = unwrap(
        await supabase
          .from('posts')
          .insert({
            author_id: userId,
            text: text?.trim() || null,
            ride_id: rideId ?? null,
            ride_snapshot: ride ? rideSnapshot(ride) : null,
            photo_paths: photoPaths,
            audience,
          })
          .select('id')
          .single(),
      );
      const post =
        inserted && unwrap(await supabase.rpc('community_post', { p_id: inserted.id }));
      if (!post) {
        throw new Error('Post not readable after insert');
      }
      return mapPost(post);
    } catch (error) {
      await removeFiles('post-photos', photoPaths).catch(() => undefined);
      throw error;
    }
  },

  async setLiked(postId, liked) {
    const userId = await requireUserId();
    if (liked) {
      unwrap(
        await supabase
          .from('post_likes')
          .upsert(
            { user_id: userId, post_id: postId },
            { onConflict: 'user_id,post_id', ignoreDuplicates: true },
          ),
      );
    } else {
      unwrap(
        await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId),
      );
    }
  },

  followAuthor(authorId) {
    return supabaseRidersRepository.setFollowing(authorId, true);
  },

  async listComments(target) {
    if (target.type === 'post' && !isUuid(target.id)) {
      return [];
    }
    const rows = unwrap(
      await supabase.rpc('list_comments', { p_target: target.type, p_id: target.id }),
    );
    return (rows ?? []).map(mapComment);
  },

  async addComment(target, text) {
    await requireUserId();
    return mapComment(
      unwrap(
        await supabase.rpc('add_comment', {
          p_target: target.type,
          p_id: target.id,
          p_text: text.trim(),
        }),
      ),
    );
  },

  async deleteComment(target, commentId) {
    await requireUserId();
    unwrap(await supabase.from(commentTable(target)).delete().eq('id', commentId));
  },

  async suggest(query) {
    const result = unwrap(
      await supabase.rpc('community_search', { p_query: query, p_limit: SUGGESTION_LIMIT }),
    );
    return mapSearch(result).slice(0, SUGGESTION_LIMIT);
  },

  async search(query) {
    return mapSearch(
      unwrap(await supabase.rpc('community_search', { p_query: query, p_limit: SEARCH_LIMIT })),
    );
  },
};
