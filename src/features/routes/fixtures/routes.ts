import type { LngLat, Route, RouteAuthor, RouteTag } from '../types';

/**
 * MOCK DATA until the Supabase/PostGIS route catalog exists.
 * Names, summaries and metrics are taken from the Discover designs (01.2, 01.4, 01.5, 01.6, 01.7);
 * route lines are simplified polylines between the real places the names refer to.
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

const place = {
  antalya: [30.7133, 36.8969],
  adrasan: [30.47, 36.305],
  cirali: [30.477, 36.41],
  olympos: [30.473, 36.398],
  gelidonya: [30.41, 36.211],
  suluada: [30.502, 36.268],
  mavikent: [30.338, 36.254],
  kumluca: [30.29, 36.37],
  kemer: [30.56, 36.598],
  tekirova: [30.525, 36.505],
  geyikbayiri: [30.46, 36.878],
  tahtali: [30.442, 36.536],
  korkuteli: [30.196, 37.066],
  saklikent: [30.332, 36.866],
  termessos: [30.465, 36.982],
  kas: [29.637, 36.201],
  kalkan: [29.414, 36.265],
  dosemealti: [30.6, 37.03],
} satisfies Record<string, LngLat>;

/** Straight-ish line through the given places with a gentle bend between each pair. */
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

type RouteSeed = Pick<Route, 'id' | 'name' | 'summary' | 'tag' | 'distanceKm' | 'durationMinutes' | 'averageSpeedKmh'> &
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

function route({ from, via = [], to, ...seed }: RouteSeed, index: number): Route {
  return {
    city: 'Antalya',
    maxSpeedKmh: Math.round(seed.averageSpeedKmh * 1.7),
    elevationGainM: 120 + ((index * 37) % 400),
    elevationLossM: -(100 + ((index * 29) % 380)),
    difficulty: 'moderate',
    surface: 'asphalt',
    author: yasemin,
    publishedAt: '2026-09-12',
    coverImage: coverByTag[seed.tag],
    photos: [photos.mountainRoad, photos.coast, photos.desertRider, photos.forestRide],
    coordinates: line(from, ...via, to),
    popularity: 100 - index * 3,
    isLoop: false,
    rating: Math.round((4.9 - (index % 6) * 0.1) * 10) / 10,
    ratingCount: 126 - index * 5,
    ...seed,
  };
}

const seeds: RouteSeed[] = [
  // "Senin için önerilenler" (01.5) and map sheet (01.7)
  { id: 'adrasan', name: 'Adrasan Rotası', summary: 'Sakin ve manzaralı', tag: 'coast', distanceKm: 72, durationMinutes: 85, averageSpeedKmh: 51, from: place.kumluca, to: place.adrasan },
  {
    id: 'geyikbayiri',
    name: 'Geyikbayırı Rotası',
    summary: 'Doğayla baş başa',
    tag: 'curvy',
    distanceKm: 58,
    durationMinutes: 80,
    averageSpeedKmh: 41,
    maxSpeedKmh: 72,
    elevationGainM: 236,
    elevationLossM: -198,
    notes: "Antalya'nın doğasında, dağ manzaraları eşliğinde keyifli bir sürüş. Virajlar akıcı, manzara harika.",
    from: place.antalya,
    via: [place.dosemealti],
    to: place.geyikbayiri,
  },
  { id: 'cirali', name: 'Çıralı Rotası', summary: 'Gün batımı keyfi', tag: 'scenic', distanceKm: 46, durationMinutes: 65, averageSpeedKmh: 42, from: place.tekirova, to: place.cirali },
  { id: 'kas-kalkan', author: deniz, name: 'Kaş – Kalkan Rotası', summary: 'Koydan koya sahil', tag: 'coast', distanceKm: 68, durationMinutes: 100, averageSpeedKmh: 41, city: 'Antalya', from: place.kas, to: place.kalkan },
  // Search results for "adrasan" (01.2)
  { id: 'adrasan-cirali', name: 'Adrasan – Çıralı Rotası', summary: 'Doğa ve deniz bir arada', tag: 'nature', distanceKm: 46, durationMinutes: 70, averageSpeedKmh: 39, from: place.adrasan, to: place.cirali },
  { id: 'adrasan-mountain', name: 'Adrasan Dağ Yolu', summary: 'Virajlı ve manzaralı', tag: 'curvy', distanceKm: 58, durationMinutes: 80, averageSpeedKmh: 44, from: place.adrasan, via: [place.kumluca], to: place.tahtali },
  { id: 'gelidonya', name: 'Gelidonya Feneri Rotası', summary: 'Tarihi ve doğal güzellikler', tag: 'scenic', distanceKm: 34, durationMinutes: 65, averageSpeedKmh: 31, from: place.adrasan, to: place.gelidonya },
  { id: 'suluada', name: 'Suluada Tekne Rotası', summary: 'Mavi yolculuk', tag: 'coast', distanceKm: 28, durationMinutes: 50, averageSpeedKmh: 34, isLoop: true, from: place.adrasan, via: [place.suluada], to: place.adrasan },
  { id: 'adrasan-olympos', name: 'Adrasan – Olympos Rotası', summary: 'Antik kent ve doğa', tag: 'nature', distanceKm: 62, durationMinutes: 100, averageSpeedKmh: 37, from: place.adrasan, to: place.olympos },
  { id: 'adrasan-mavikent', name: 'Adrasan – Mavikent Rotası', summary: 'Sahil boyunca keyifli sürüş', tag: 'coast', distanceKm: 39, durationMinutes: 60, averageSpeedKmh: 39, from: place.adrasan, to: place.mavikent },
  { id: 'adrasan-sunset', name: 'Adrasan Gün Batımı Rotası', summary: 'En güzel manzara noktaları', tag: 'scenic', distanceKm: 48, durationMinutes: 90, averageSpeedKmh: 32, from: place.adrasan, via: [place.suluada], to: place.gelidonya },
  // "Önerilen Rotalar" (01.4)
  { id: 'coastal-cruise', author: deniz, name: 'Sahil yolu keyfi', summary: 'Deniz kenarında sakin sürüş', tag: 'coast', distanceKm: 82, durationMinutes: 100, averageSpeedKmh: 49, difficulty: 'easy', from: place.antalya, to: place.kemer },
  { id: 'pine-forest', name: 'Çam ormanı turu', summary: 'Gölgeli orman yolları', tag: 'nature', distanceKm: 56, durationMinutes: 75, averageSpeedKmh: 45, from: place.antalya, to: place.termessos },
  { id: 'tahtali-foothills', name: 'Tahtalı etekleri', summary: 'Virajlı ve yüksek rakım', tag: 'curvy', distanceKm: 64, durationMinutes: 90, averageSpeedKmh: 43, from: place.kemer, to: place.tahtali },
  { id: 'korkuteli-curves', name: 'Korkuteli virajları', summary: 'Ardı ardına viraj', tag: 'curvy', distanceKm: 71, durationMinutes: 105, averageSpeedKmh: 41, difficulty: 'hard', isLoop: true, from: place.antalya, via: [place.korkuteli], to: place.antalya },
  { id: 'olympos-cirali', name: 'Olympos – Çıralı Rotası', summary: 'Antik kent ve deniz', tag: 'scenic', distanceKm: 38, durationMinutes: 55, averageSpeedKmh: 41, from: place.olympos, to: place.cirali },
  { id: 'saklikent', name: 'Saklıkent Yaylası', summary: 'Yükseklerde serin sürüş', tag: 'offRoad', distanceKm: 45, durationMinutes: 70, averageSpeedKmh: 39, difficulty: 'hard', surface: 'gravel', from: place.antalya, to: place.saklikent },
  { id: 'kemer-tekirova', author: deniz, name: 'Kemer – Tekirova Sahili', summary: 'Deniz kenarında kısa kaçamak', tag: 'coast', distanceKm: 33, durationMinutes: 50, averageSpeedKmh: 40, from: place.kemer, to: place.tekirova },
  { id: 'termessos', name: 'Termessos Antik Yolu', summary: 'Tarih ve orman bir arada', tag: 'city', distanceKm: 52, durationMinutes: 80, averageSpeedKmh: 39, from: place.antalya, to: place.termessos },
];

export const ROUTE_FIXTURES: readonly Route[] = seeds.map(route);

/** Order of "Senin için önerilenler" on Discover Home. */
export const RECOMMENDED_ROUTE_IDS = ['adrasan', 'geyikbayiri', 'cirali', 'kas-kalkan', 'coastal-cruise', 'pine-forest'];

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
