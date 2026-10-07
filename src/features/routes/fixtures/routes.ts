import type { LngLat, Route, RouteAuthor, RouteStop, RouteTag } from '../types';
import { ROUTE_GEOMETRIES, type RouteGeometry } from './routeGeometries';

/**
 * MOCK DATA until the Supabase/PostGIS route catalog exists.
 * Names and summaries are taken from the Discover designs (01.2, 01.4, 01.5, 01.6, 01.7). Lines
 * and metrics (distance, duration, average speed, bends) are real Mapbox Directions (driving)
 * results through each seed's `from` / `via` / `to`, generated into `routeGeometries.ts` by
 * `scripts/generate-route-geometries.mjs` (its place table mirrors `place` below; rerun it after
 * changing either). The hand-written metrics in the seeds are the designs' sample numbers, used
 * only for a route without generated geometry (Suluada, a boat route).
 */
const photos = {
  coast: require('../../../../assets/images/routes/route-coast.jpg'),
  mountainRoad: require('../../../../assets/images/routes/route-mountain-road.jpg'),
  desertRider: require('../../../../assets/images/routes/route-desert-rider.jpg'),
  forestRide: require('../../../../assets/images/routes/route-forest-ride.jpg'),
};

const yasemin: RouteAuthor = {
  id: 'yasemin-ozel',
  name: 'Yasemin Özel',
  avatar: require('../../../../assets/images/avatars/sample-rider.jpg'),
};

const deniz: RouteAuthor = {
  id: 'deniz-kaya',
  name: 'Deniz Kaya',
  avatar: require('../../../../assets/images/avatars/deniz-kaya.jpg'),
};

/** Road-reachable points of the places (Directions snaps each to the nearest road). */
const place = {
  antalya: [30.7133, 36.8969],
  adrasan: [30.4653, 36.3116],
  cirali: [30.4809, 36.4159],
  // End of the Olympos valley road at the ancient city's entrance (not the Çıralı side).
  olympos: [30.4704, 36.3929],
  // Karaöz trailhead of the Lycian Way to the lighthouse, where the road ends.
  gelidonya: [30.415, 36.2636],
  suluada: [30.502, 36.268],
  mavikent: [30.3475, 36.3144],
  kumluca: [30.29, 36.37],
  kemer: [30.56, 36.598],
  tekirova: [30.5252, 36.4991],
  geyikbayiri: [30.46, 36.878],
  // Lower station of the Olympos Teleferik; the summit is reached by cable car only.
  tahtali: [30.487, 36.5408],
  korkuteli: [30.196, 37.066],
  saklikent: [30.3346, 36.8417],
  // Car park below the ancient city.
  termessos: [30.4678, 36.9884],
  kas: [29.637, 36.201],
  kalkan: [29.414, 36.265],
} satisfies Record<string, LngLat>;

type PlaceKey = keyof typeof place;

/** Display names of the fixture places (shown as-is, like any user content). */
const placeNames: Record<PlaceKey, string> = {
  antalya: 'Antalya',
  adrasan: 'Adrasan',
  cirali: 'Çıralı',
  olympos: 'Olympos',
  gelidonya: 'Gelidonya Feneri',
  suluada: 'Suluada',
  mavikent: 'Mavikent',
  kumluca: 'Kumluca',
  kemer: 'Kemer',
  tekirova: 'Tekirova',
  geyikbayiri: 'Geyikbayırı',
  tahtali: 'Tahtalı Dağı',
  korkuteli: 'Korkuteli',
  saklikent: 'Saklıkent',
  termessos: 'Termessos',
  kas: 'Kaş',
  kalkan: 'Kalkan',
};

const nameOf = (coordinates: LngLat) =>
  placeNames[
    (Object.keys(place) as PlaceKey[]).find((key) => place[key] === coordinates) ?? 'antalya'
  ];

/** Straight-ish line through the given places, for a route without generated geometry. */
function line(...points: LngLat[]): LngLat[] {
  const result: LngLat[] = [];
  points.forEach((point, index) => {
    const next = points[index + 1];
    result.push(point);
    if (next) {
      const bend = index % 2 === 0 ? 0.012 : -0.012;
      result.push([(point[0] + next[0]) / 2 + bend, (point[1] + next[1]) / 2 - bend]);
    }
  });
  return result;
}

type RouteSeed = Pick<
  Route,
  'id' | 'name' | 'summary' | 'tag' | 'distanceKm' | 'durationMinutes' | 'averageSpeedKmh'
> &
  Partial<Route> & { from: LngLat; via?: LngLat[]; to: LngLat };

const coverByTag: Record<RouteTag, Route['coverImage']> = {
  coast: photos.coast,
  curvy: photos.mountainRoad,
  scenic: photos.desertRider,
  city: photos.forestRide,
  nature: photos.forestRide,
  offRoad: photos.desertRider,
  longTour: photos.mountainRoad,
};

type RouteContent = Omit<RouteSeed, 'from' | 'via' | 'to'>;

/** Scales the seed's stops to the generated totals; the finish matches them exactly. */
function rescaleStops(stops: RouteStop[], seed: RouteContent, geometry: RouteGeometry): RouteStop[] {
  const distanceScale = geometry.distanceKm / seed.distanceKm;
  const durationScale = geometry.durationMinutes / seed.durationMinutes;
  return stops.map((stop) =>
    stop.kind === 'end'
      ? { ...stop, distanceKm: geometry.distanceKm, durationMinutes: geometry.durationMinutes }
      : {
          ...stop,
          distanceKm: Math.round(stop.distanceKm * distanceScale),
          durationMinutes: Math.round(stop.durationMinutes * durationScale),
        },
  );
}

/** Line and metrics: the generated road geometry when there is one, else the seed's own values. */
function routeMetrics(seed: RouteContent, places: LngLat[]) {
  const geometry: RouteGeometry | undefined = ROUTE_GEOMETRIES[seed.id];
  if (!geometry) {
    return {
      coordinates: line(...places),
      distanceKm: seed.distanceKm,
      durationMinutes: seed.durationMinutes,
      averageSpeedKmh: seed.averageSpeedKmh,
      curveCount:
        seed.curveCount ?? Math.round(seed.distanceKm * (seed.tag === 'curvy' ? 0.6 : 0.3)),
    };
  }
  return {
    coordinates: geometry.coordinates,
    distanceKm: geometry.distanceKm,
    durationMinutes: geometry.durationMinutes,
    averageSpeedKmh: Math.round(geometry.distanceKm / (geometry.durationMinutes / 60)),
    curveCount: geometry.curveCount,
    ...(seed.stops ? { stops: rescaleStops(seed.stops, seed, geometry) } : {}),
  };
}

function route({ from, via = [], to, ...seed }: RouteSeed, index: number): Route {
  const metrics = routeMetrics(seed, [from, ...via, to]);
  return {
    city: 'Antalya',
    startName: nameOf(from),
    endName: nameOf(to),
    maxSpeedKmh: Math.round(metrics.averageSpeedKmh * 1.7),
    breakCount: Math.max(1, Math.round(metrics.durationMinutes / 60)),
    elevationGainM: 120 + ((index * 37) % 400),
    elevationLossM: -(100 + ((index * 29) % 380)),
    difficulty: 'moderate',
    surface: 'asphalt',
    author: yasemin,
    publishedAt: '2026-09-12',
    coverImage: coverByTag[seed.tag],
    photos: [photos.mountainRoad, photos.coast, photos.desertRider, photos.forestRide],
    popularity: 100 - index * 3,
    isLoop: false,
    rating: Math.round((4.9 - (index % 6) * 0.1) * 10) / 10,
    ratingCount: 126 - index * 5,
    ...seed,
    ...metrics,
  };
}

const seeds: RouteSeed[] = [
  // "Senin için önerilenler" (01.5) and map sheet (01.7)
  {
    id: 'adrasan',
    name: 'Adrasan Rotası',
    summary: 'Sakin ve manzaralı',
    tag: 'coast',
    distanceKm: 72,
    durationMinutes: 85,
    averageSpeedKmh: 51,
    from: place.kumluca,
    to: place.adrasan,
  },
  {
    id: 'geyikbayiri',
    name: 'Geyikbayırı Rotası',
    summary: 'Doğayla baş başa',
    tag: 'curvy',
    distanceKm: 58,
    durationMinutes: 80,
    averageSpeedKmh: 41,
    elevationGainM: 236,
    elevationLossM: -198,
    notes:
      "Antalya'nın doğasında, dağ manzaraları eşliğinde keyifli bir sürüş. Virajlar akıcı, manzara harika.",
    breakCount: 2,
    // "Rota durakları" of 05.04 Uzun içerik (`w7AvU`); distances and times are scaled to the
    // generated totals (`rescaleStops`).
    stops: [
      { kind: 'start', name: 'Geyikbayırı', distanceKm: 0, durationMinutes: 0 },
      { kind: 'stop', name: 'Trebenna Seyir Noktası', distanceKm: 24, durationMinutes: 30 },
      { kind: 'stop', name: 'Dağ Kahvesi', distanceKm: 42, durationMinutes: 65 },
      { kind: 'end', name: 'Tahtalı Dağı', distanceKm: 58, durationMinutes: 80 },
    ],
    // From Geyikbayırı to Tahtalı Dağı, like its stops (there is no mountain road between them,
    // so it runs along the Konyaaltı and Kemer coast).
    from: place.geyikbayiri,
    to: place.tahtali,
  },
  {
    id: 'cirali',
    name: 'Çıralı Rotası',
    summary: 'Gün batımı keyfi',
    tag: 'scenic',
    distanceKm: 46,
    durationMinutes: 65,
    averageSpeedKmh: 42,
    from: place.tekirova,
    to: place.cirali,
  },
  {
    id: 'kas-kalkan',
    author: deniz,
    name: 'Kaş – Kalkan Rotası',
    summary: 'Koydan koya sahil',
    tag: 'coast',
    distanceKm: 68,
    durationMinutes: 100,
    averageSpeedKmh: 41,
    city: 'Antalya',
    from: place.kas,
    to: place.kalkan,
  },
  // Search results for "adrasan" (01.2)
  {
    id: 'adrasan-cirali',
    name: 'Adrasan – Çıralı Rotası',
    summary: 'Doğa ve deniz bir arada',
    tag: 'nature',
    distanceKm: 46,
    durationMinutes: 70,
    averageSpeedKmh: 39,
    from: place.adrasan,
    to: place.cirali,
  },
  {
    id: 'adrasan-mountain',
    name: 'Adrasan Dağ Yolu',
    summary: 'Virajlı ve manzaralı',
    tag: 'curvy',
    distanceKm: 58,
    durationMinutes: 80,
    averageSpeedKmh: 44,
    // No via Kumluca: it would ride the same stretch of the D400 there and back.
    from: place.adrasan,
    to: place.tahtali,
  },
  {
    id: 'gelidonya',
    name: 'Gelidonya Feneri Rotası',
    summary: 'Tarihi ve doğal güzellikler',
    tag: 'scenic',
    distanceKm: 34,
    durationMinutes: 65,
    averageSpeedKmh: 31,
    from: place.adrasan,
    to: place.gelidonya,
  },
  {
    id: 'suluada',
    name: 'Suluada Tekne Rotası',
    summary: 'Mavi yolculuk',
    tag: 'coast',
    distanceKm: 28,
    durationMinutes: 50,
    averageSpeedKmh: 34,
    isLoop: true,
    from: place.adrasan,
    via: [place.suluada],
    to: place.adrasan,
  },
  {
    id: 'adrasan-olympos',
    name: 'Adrasan – Olympos Rotası',
    summary: 'Antik kent ve doğa',
    tag: 'nature',
    distanceKm: 62,
    durationMinutes: 100,
    averageSpeedKmh: 37,
    from: place.adrasan,
    to: place.olympos,
  },
  {
    id: 'adrasan-mavikent',
    name: 'Adrasan – Mavikent Rotası',
    summary: 'Sahil boyunca keyifli sürüş',
    tag: 'coast',
    distanceKm: 39,
    durationMinutes: 60,
    averageSpeedKmh: 39,
    from: place.adrasan,
    to: place.mavikent,
  },
  {
    id: 'adrasan-sunset',
    name: 'Adrasan Gün Batımı Rotası',
    summary: 'En güzel manzara noktaları',
    tag: 'scenic',
    distanceKm: 48,
    durationMinutes: 90,
    averageSpeedKmh: 32,
    // Suluada is an island; the ride ends at the Gelidonya lighthouse trailhead (sunset point).
    from: place.adrasan,
    to: place.gelidonya,
  },
  // "Önerilen Rotalar" (01.4)
  {
    id: 'coastal-cruise',
    author: deniz,
    name: 'Sahil yolu keyfi',
    summary: 'Deniz kenarında sakin sürüş',
    tag: 'coast',
    distanceKm: 82,
    durationMinutes: 100,
    averageSpeedKmh: 49,
    difficulty: 'easy',
    from: place.antalya,
    to: place.kemer,
  },
  {
    id: 'pine-forest',
    name: 'Çam ormanı turu',
    summary: 'Gölgeli orman yolları',
    tag: 'nature',
    distanceKm: 56,
    durationMinutes: 75,
    averageSpeedKmh: 45,
    from: place.antalya,
    to: place.termessos,
  },
  {
    id: 'tahtali-foothills',
    name: 'Tahtalı etekleri',
    summary: 'Virajlı ve yüksek rakım',
    tag: 'curvy',
    distanceKm: 64,
    durationMinutes: 90,
    averageSpeedKmh: 43,
    from: place.kemer,
    to: place.tahtali,
  },
  {
    id: 'korkuteli-curves',
    name: 'Korkuteli virajları',
    summary: 'Ardı ardına viraj',
    tag: 'curvy',
    distanceKm: 71,
    durationMinutes: 105,
    averageSpeedKmh: 41,
    difficulty: 'hard',
    isLoop: true,
    from: place.antalya,
    via: [place.korkuteli],
    to: place.antalya,
  },
  {
    id: 'olympos-cirali',
    name: 'Olympos – Çıralı Rotası',
    summary: 'Antik kent ve deniz',
    tag: 'scenic',
    distanceKm: 38,
    durationMinutes: 55,
    averageSpeedKmh: 41,
    from: place.olympos,
    to: place.cirali,
  },
  {
    id: 'saklikent',
    name: 'Saklıkent Yaylası',
    summary: 'Yükseklerde serin sürüş',
    tag: 'offRoad',
    distanceKm: 45,
    durationMinutes: 70,
    averageSpeedKmh: 39,
    difficulty: 'hard',
    surface: 'gravel',
    from: place.antalya,
    to: place.saklikent,
  },
  {
    id: 'kemer-tekirova',
    author: deniz,
    name: 'Kemer – Tekirova Sahili',
    summary: 'Deniz kenarında kısa kaçamak',
    tag: 'coast',
    distanceKm: 33,
    durationMinutes: 50,
    averageSpeedKmh: 40,
    from: place.kemer,
    to: place.tekirova,
  },
  {
    id: 'termessos',
    name: 'Termessos Antik Yolu',
    summary: 'Tarih ve orman bir arada',
    tag: 'city',
    distanceKm: 52,
    durationMinutes: 80,
    averageSpeedKmh: 39,
    from: place.antalya,
    to: place.termessos,
  },
];

export const ROUTE_FIXTURES: readonly Route[] = seeds.map(route);

/** Order of "Senin için önerilenler" on Discover Home. */
export const RECOMMENDED_ROUTE_IDS = [
  'adrasan',
  'geyikbayiri',
  'cirali',
  'kas-kalkan',
  'coastal-cruise',
  'pine-forest',
];

/** "Önerilen Rotalar — Tümü" (01.4) list order. */
export const RECOMMENDED_LIST_IDS = [
  'coastal-cruise',
  'pine-forest',
  'tahtali-foothills',
  'korkuteli-curves',
  'olympos-cirali',
  'saklikent',
  'kemer-tekirova',
  'termessos',
];
