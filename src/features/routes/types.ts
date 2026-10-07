import type { ImageSourcePropType } from 'react-native';

/** [longitude, latitude] — GeoJSON / Mapbox order. */
export type LngLat = [number, number];

/**
 * Route character used by the Discover chips, badges and the filter sheet's "Yol tipi"
 * ("Sahil", "Virajlı", "Manzara", "Şehir İçi", "Doğa", "Off-road", "Uzun tur"); labels via `routes:tags.*`.
 * Separate from `RideType`, which classifies a recorded ride.
 */
export type RouteTag = 'coast' | 'curvy' | 'scenic' | 'city' | 'nature' | 'offRoad' | 'longTour';

/** Discover filter chips: every tag, plus "Tümü" and the distance filter "Yakın Rotalar". */
export type RouteFilter = 'all' | 'nearby' | RouteTag;

/** "Sırala" sheet options (zLNlt); labels via `routes:sort.*`. */
export type RouteSort = 'recommended' | 'nearest' | 'shortest' | 'longest' | 'popular';

export type RouteDifficulty = 'easy' | 'moderate' | 'hard';
export type RoadSurface = 'asphalt' | 'mixed' | 'gravel';

/** One point of "Rota durakları" (05.04 `Q9Cbe`): start, intermediate stops and finish. */
export type RouteStop = {
  kind: 'start' | 'stop' | 'end';
  /** Place name, shown as-is. */
  name: string;
  /** Distance and expected riding time from the start ("24 km · ~30 dk"). */
  distanceKm: number;
  durationMinutes: number;
};

export type RouteAuthor = {
  /** Rider id for the rider profile (01.8, `/rider/[id]`). */
  id: string;
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
  /** Place names at the two ends, for "Rotayı sür" (06.01: start → finish). */
  startName: string;
  endName: string;
  distanceKm: number;
  durationMinutes: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  /** Notable bends and planned breaks along the route ("Viraj", "Mola" on 05.04). */
  curveCount: number;
  breakCount: number;
  elevationGainM: number;
  elevationLossM: number;
  difficulty: RouteDifficulty;
  surface: RoadSurface;
  author: RouteAuthor;
  /** ISO date the route was published. */
  publishedAt: string;
  notes?: string;
  /** Ordered stops from start to finish; routes without intermediate stops have none. */
  stops?: RouteStop[];
  coverImage: ImageSourcePropType;
  photos: ImageSourcePropType[];
  /** Route line from start to finish. */
  coordinates: LngLat[];
  /** Relative popularity used by the "En popüler" / "Önerilen" sorts. */
  popularity: number;
  /** Ends where it starts ("Sadece döngü rotalar" filter). */
  isLoop: boolean;
  /** Average rider rating 0–5 and number of ratings, e.g. "4,8 ★ (126)". */
  rating: number;
  ratingCount: number;
};

/** South-west and north-east corners. */
export type Bounds = { southWest: LngLat; northEast: LngLat };

/** "Mesafe" options of the search filter sheet (PXcQ0): < 50, 50–100, 100–200, 200+ km. */
export type DistanceRange = 'under50' | 'from50to100' | 'from100to200' | 'over200';

/** "Süre" options of the search filter sheet (PXcQ0): < 1 h, 1–3 h, 3+ h. */
export type DurationRange = 'under1h' | 'from1to3h' | 'over3h';

/**
 * Search filter sheet (PXcQ0). `null` / empty means "no constraint" for that group;
 * road types match any of the selected tags.
 */
export type RouteSearchFilters = {
  distance: DistanceRange | null;
  duration: DurationRange | null;
  tags: readonly RouteTag[];
  difficulty: RouteDifficulty | null;
  loopOnly: boolean;
};

/**
 * A searchable place ("YERLER" in the typing suggestions, aZnjb), e.g. "Adrasan" in
 * Kumluca, Antalya with 12 routes. Place names come from data and are shown as-is.
 */
export type Place = {
  id: string;
  name: string;
  district: string;
  province: string;
  routeCount: number;
  centre: LngLat;
};

/** Typing suggestions (aZnjb): matching routes ("ROTALAR") and places ("YERLER"). */
export type SearchSuggestions = {
  routes: Route[];
  places: Place[];
};

/**
 * Data access for routes. Screens use the React Query hooks in `queries.ts`; the mock
 * implementation is replaced by self-hosted Supabase (PostGIS) later.
 */
export interface RoutesRepository {
  listRecommended(params: { city: string; filter: RouteFilter }): Promise<Route[]>;
  search(params: { query: string; sort: RouteSort; city: string; filters?: RouteSearchFilters }): Promise<Route[]>;
  /** Suggestions while typing, before the search is submitted. */
  suggest(params: { query: string }): Promise<SearchSuggestions>;
  listInArea(params: { bounds: Bounds; filter: RouteFilter }): Promise<Route[]>;
  getById(id: string): Promise<Route | null>;
}
