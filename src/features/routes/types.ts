import type { ImageSourcePropType } from 'react-native';

/** [longitude, latitude] — GeoJSON / Mapbox order. */
export type LngLat = [number, number];

/**
 * Route character used by the Discover chips and badges ("Sahil", "Virajlı", "Manzara",
 * "Şehir İçi", "Doğa"); labels via `routes:tags.*`. Separate from `RideType`, which
 * classifies a recorded ride.
 */
export type RouteTag = 'coast' | 'curvy' | 'scenic' | 'city' | 'nature';

/** Discover filter chips: every tag, plus "Tümü" and the distance filter "Yakın Rotalar". */
export type RouteFilter = 'all' | 'nearby' | RouteTag;

/** "Sırala" sheet options (zLNlt); labels via `routes:sort.*`. */
export type RouteSort = 'recommended' | 'nearest' | 'shortest' | 'longest' | 'popular';

export type RouteDifficulty = 'easy' | 'moderate' | 'hard';
export type RoadSurface = 'asphalt' | 'mixed' | 'gravel';

export type RouteAuthor = {
  name: string;
  avatar?: ImageSourcePropType;
};

/**
 * A reusable, published route (CLAUDE.md: Route ≠ Ride). Content fields (name, summary,
 * notes) are user-generated and shown as-is, not translated.
 */
export type Route = {
  id: string;
  name: string;
  /** One-line description under the title, e.g. "Sakin ve manzaralı". */
  summary: string;
  tag: RouteTag;
  /** Province the route starts in, matching `TurkishCity.name`. */
  city: string;
  distanceKm: number;
  durationMinutes: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainM: number;
  elevationLossM: number;
  difficulty: RouteDifficulty;
  surface: RoadSurface;
  author: RouteAuthor;
  /** ISO date the route was published. */
  publishedAt: string;
  notes?: string;
  coverImage: ImageSourcePropType;
  photos: ImageSourcePropType[];
  /** Route line from start to finish. */
  coordinates: LngLat[];
  /** Relative popularity used by the "En popüler" / "Önerilen" sorts. */
  popularity: number;
};

/** South-west and north-east corners. */
export type Bounds = { southWest: LngLat; northEast: LngLat };

/**
 * Data access for routes. Screens use the React Query hooks in `queries.ts`; the mock
 * implementation is replaced by self-hosted Supabase (PostGIS) later.
 */
export interface RoutesRepository {
  listRecommended(params: { city: string; filter: RouteFilter }): Promise<Route[]>;
  search(params: { query: string; sort: RouteSort; city: string }): Promise<Route[]>;
  listInArea(params: { bounds: Bounds; filter: RouteFilter }): Promise<Route[]>;
  getById(id: string): Promise<Route | null>;
}
