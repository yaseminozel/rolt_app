import type { ImageSourcePropType } from 'react-native';

import { offlineRoute } from '@/features/offlineMaps/offlineMaps';
import { requireUserId, supabase, unwrap } from '@/lib/supabase/client';
import { imageSource } from '@/lib/supabase/storage';

import { filterRoutes } from './routeFilter';
import { sortRoutes } from './routeSort';
import { matchesSearchFilters } from './searchFilters';
import type {
  LngLat,
  Place,
  RoadSurface,
  Route,
  RouteDifficulty,
  RoutesRepository,
  RouteStop,
  RouteTag,
} from './types';

/** Cover of a route without photos: the design's route map artwork. */
const FALLBACK_COVER: ImageSourcePropType = require('../../../assets/images/maps/route-map-fallback.jpg');

const SUGGESTION_LIMIT = 3;
/** The map area query has no city; "Yakın Rotalar" there measures from Antalya, like the mock. */
const AREA_NEARBY_CITY = 'Antalya';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `public.route_json` (supabase/migrations/0002_routes.sql). */
type RouteJson = {
  id: string;
  name: string;
  summary: string;
  tag: RouteTag;
  city: string;
  startName: string;
  endName: string;
  distanceKm: number;
  durationMinutes: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  curveCount: number;
  breakCount: number;
  elevationGainM: number;
  elevationLossM: number;
  difficulty: RouteDifficulty;
  surface: RoadSurface;
  author: { id: string | null; name: string; avatarPath: string | null };
  publishedAt: string;
  notes: string | null;
  stops: RouteStop[] | null;
  coverPath: string | null;
  photoPaths: string[] | null;
  coordinates: LngLat[] | null;
  popularity: number;
  isLoop: boolean;
  rating: number;
  ratingCount: number;
};

function toRoute(json: RouteJson): Route {
  const photoPaths = json.photoPaths ?? [];
  const coverPath = json.coverPath ?? photoPaths[0];
  return {
    id: json.id,
    name: json.name,
    summary: json.summary,
    tag: json.tag,
    city: json.city,
    startName: json.startName,
    endName: json.endName,
    distanceKm: json.distanceKm,
    durationMinutes: json.durationMinutes,
    averageSpeedKmh: json.averageSpeedKmh,
    maxSpeedKmh: json.maxSpeedKmh,
    curveCount: json.curveCount,
    breakCount: json.breakCount,
    elevationGainM: json.elevationGainM,
    elevationLossM: json.elevationLossM,
    difficulty: json.difficulty,
    surface: json.surface,
    author: {
      id: json.author.id ?? '',
      name: json.author.name,
      avatar: imageSource('avatars', json.author.avatarPath, 'thumb'),
    },
    publishedAt: json.publishedAt,
    notes: json.notes ?? undefined,
    stops: json.stops ?? undefined,
    coverImage: imageSource('route-photos', coverPath, 'card') ?? FALLBACK_COVER,
    photos: photoPaths.flatMap((path) => imageSource('route-photos', path, 'full') ?? []),
    coordinates: json.coordinates ?? [],
    popularity: json.popularity,
    isLoop: json.isLoop,
    rating: json.rating,
    ratingCount: json.ratingCount,
  };
}

const toRoutes = (rows: unknown) => ((rows ?? []) as RouteJson[]).map(toRoute);

/** PostgREST reports a request that never reached the server with status 0 (offline). */
const isOffline = (result: { error: unknown; status: number }) =>
  result.error !== null && result.status === 0;

/**
 * The route record stored with its offline map ("Çevrimdışı harita"), for opening a downloaded
 * route without a connection. Records are JSON: photos are URLs (seen photos come from the image
 * cache); a bundled asset number from an older build may point elsewhere, so it is replaced.
 */
function storedRoute(id: string): Route | undefined {
  const route = offlineRoute(id);
  if (!route) {
    return undefined;
  }
  const isAsset = (source: unknown) => typeof source === 'number';
  return {
    ...route,
    coverImage: isAsset(route.coverImage) ? FALLBACK_COVER : route.coverImage,
    photos: route.photos.filter((photo) => !isAsset(photo)),
    author: { ...route.author, avatar: isAsset(route.author.avatar) ? undefined : route.author.avatar },
  };
}

/**
 * RoutesRepository on the self-hosted Supabase (PostGIS read models in 0002_routes.sql). The
 * server narrows by text and area; Discover chips, the search filter sheet and the sort are
 * applied here on the result, exactly like the mock.
 */
export const supabaseRoutesRepository: RoutesRepository = {
  async listRecommended({ city, filter }) {
    const rows = unwrap(await supabase.rpc('routes_recommended', { p_list: 'home' }));
    return filterRoutes(toRoutes(rows), filter, city);
  },

  async listFeatured() {
    return toRoutes(unwrap(await supabase.rpc('routes_recommended', { p_list: 'list' })));
  },

  async search({ query, sort, city, filters }) {
    const rows = unwrap(await supabase.rpc('routes_search', { p_query: query }));
    const matches = toRoutes(rows).filter((route) => !filters || matchesSearchFilters(route, filters));
    return sortRoutes(matches, sort, city);
  },

  async suggest({ query }) {
    const result = unwrap(
      await supabase.rpc('routes_suggest', { p_query: query, p_limit: SUGGESTION_LIMIT }),
    ) as { routes?: RouteJson[]; places?: Place[] } | null;
    return {
      routes: (result?.routes ?? []).map(toRoute),
      places: (result?.places ?? []).slice(0, SUGGESTION_LIMIT),
    };
  },

  async listInArea({ bounds, filter, query = '' }) {
    const rows = unwrap(
      await supabase.rpc('routes_in_area', {
        p_west: bounds.southWest[0],
        p_south: bounds.southWest[1],
        p_east: bounds.northEast[0],
        p_north: bounds.northEast[1],
        p_query: query,
      }),
    );
    return filterRoutes(toRoutes(rows), filter, AREA_NEARBY_CITY);
  },

  async listStartingNear({ origin, radiusKm }) {
    const rows = unwrap(
      await supabase.rpc('routes_near', { p_lng: origin[0], p_lat: origin[1], p_radius_km: radiusKm }),
    );
    return toRoutes(rows);
  },

  async listByIds(ids) {
    if (ids.length === 0) {
      return [];
    }
    const result = await supabase.rpc('routes_by_ids', { p_ids: [...ids] });
    if (isOffline(result)) {
      // Offline: the downloaded routes among them still open.
      const stored = ids.flatMap((id) => storedRoute(id) ?? []);
      if (stored.length > 0) {
        return stored;
      }
    }
    return toRoutes(unwrap(result));
  },

  async getById(id) {
    const result = await supabase.rpc('route_by_id', { p_id: id });
    const stored = isOffline(result) ? storedRoute(id) : undefined;
    if (stored) {
      return stored;
    }
    const row = unwrap(result) as RouteJson | null;
    return row ? toRoute(row) : null;
  },

  async listByAuthor(authorId) {
    // Sample riders of the design fixtures have slug ids; only accounts can publish routes.
    if (!UUID.test(authorId)) {
      return [];
    }
    return toRoutes(unwrap(await supabase.rpc('routes_by_author', { p_author: authorId })));
  },

  async listSavedIds() {
    return unwrap(await supabase.rpc('saved_route_ids')) ?? [];
  },

  async setSaved(routeId, saved) {
    const userId = await requireUserId();
    if (saved) {
      unwrap(
        await supabase
          .from('saved_routes')
          .upsert(
            { user_id: userId, route_id: routeId },
            { onConflict: 'user_id,route_id', ignoreDuplicates: true },
          ),
      );
    } else {
      unwrap(
        await supabase.from('saved_routes').delete().eq('user_id', userId).eq('route_id', routeId),
      );
    }
  },
};
