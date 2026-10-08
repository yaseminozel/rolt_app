import type { RideSummary, Rider, RiderMatch } from '../types';

/**
 * MOCK DATA until the Supabase profiles exist.
 * Deniz Kaya is taken from "01.8 Discover / Sürücü profili (başkası)" (gKG8D), Yasemin Özel
 * (author of every route fixture) from "03.0 Profil / Genel" (Dimdp).
 */
const photos = {
  mountainRoad: require('../../../../assets/images/routes/route-mountain-road.jpg'),
  coast: require('../../../../assets/images/routes/route-coast.jpg'),
  forestRide: require('../../../../assets/images/routes/route-forest-ride.jpg'),
};

/** Static ride trace thumbnail: the route detail map artwork (WZKFi) with its route line. */
const rideMap = require('../../../../assets/images/maps/route-map-fallback.jpg');

/** A community sample rider with one bike and no sample rides. */
function communityRider(
  id: string,
  name: string,
  handle: string,
  brand: Rider['bikes'][number]['brand'],
  model: string,
  city: string,
): Rider {
  return {
    id,
    name,
    handle,
    city,
    bikes: [{ id: `${id}-bike`, brand, model, isPrimary: true }],
    followerCount: 0,
    followingCount: 0,
    isFollowing: false,
  };
}

export const RIDER_FIXTURES: readonly Rider[] = [
  {
    id: 'deniz-kaya',
    name: 'Deniz Kaya',
    handle: 'denizrides',
    avatar: require('../../../../assets/images/avatars/deniz-kaya.jpg'),
    bio: 'Hafta sonları sahil yolları, pazar sabahları kahve sürüşleri.',
    city: 'İstanbul, Türkiye',
    bikes: [
      {
        id: 'deniz-mt-07',
        brand: 'yamaha',
        model: 'MT-07',
        year: 2022,
        displacementCc: 689,
        category: 'naked',
        isPrimary: true,
      },
      {
        id: 'deniz-tenere',
        brand: 'yamaha',
        model: 'Ténéré 700',
        year: 2019,
        displacementCc: 689,
        category: 'adventure',
        isPrimary: false,
      },
    ],
    followerCount: 642,
    followingCount: 318,
    isFollowing: false,
  },
  {
    id: 'yasemin-ozel',
    name: 'Yasemin Özel',
    handle: 'yaseminozel',
    avatar: require('../../../../assets/images/avatars/sample-rider.jpg'),
    bio: 'Product designer and rider.',
    city: 'Antalya, Türkiye',
    bikes: [
      {
        id: 'yasemin-pulsar',
        brand: 'bajaj',
        model: 'Pulsar N250',
        displacementCc: 249,
        category: 'naked',
        isPrimary: true,
      },
    ],
    followerCount: 1284,
    followingCount: 903,
    isFollowing: false,
  },
  // Akış 22 Topluluk samples (13.01 `1005:39834`, 13.03 `1005:39656`, 13.04 `1005:39756`).
  {
    id: 'mert-kaya',
    name: 'Mert Kaya',
    handle: 'mertkaya',
    bio: 'Hafta sonu viraj avcısı. Sabah sürüşleri.',
    city: 'Antalya, Türkiye',
    bikes: [
      { id: 'mert-mt-07', brand: 'yamaha', model: 'MT-07', displacementCc: 689, isPrimary: true },
    ],
    followerCount: 342,
    followingCount: 128,
    isFollowing: true,
  },
  communityRider('burak-sen', 'Burak Şen', 'buraksen', 'honda', 'CB650R', 'İstanbul, Türkiye'),
  communityRider('elif-arslan', 'Elif Arslan', 'elifarslan', 'kawasaki', 'Z650', 'İstanbul, Türkiye'),
  {
    ...communityRider('ayse-demir', 'Ayşe Demir', 'aysedemir', 'honda', 'NC750X', 'Kaş, Antalya'),
    isFollowing: true,
  },
  communityRider('can-yildiz', 'Can Yıldız', 'canyildiz', 'ktm', '390 Duke', 'Antalya, Türkiye'),
  communityRider('kaan-aksoy', 'Kaan Aksoy', 'kaanaksoy', 'suzuki', 'V-Strom 650', 'Muğla, Türkiye'),
  communityRider('kas-riders', 'Kaş Riders', 'kasriders', 'bmw', 'R 1250 GS', 'Kaş, Antalya'),
];

export const RIDE_FIXTURES: readonly RideSummary[] = [
  {
    id: 'deniz-kemer-sunset',
    riderId: 'deniz-kaya',
    title: 'Kemer Günbatımı Sürüşü',
    rideType: 'longRide',
    startedAt: '2026-09-12T19:30:00+03:00',
    distanceKm: 12.8,
    durationMinutes: 88,
    averageSpeedKmh: 50,
    likeCount: 142,
    commentCount: 12,
    saveCount: 36,
    isLiked: false,
    isSaved: false,
    photos: [photos.mountainRoad, photos.mountainRoad],
    mapImage: rideMap,
  },
  {
    id: 'deniz-sile-coast',
    riderId: 'deniz-kaya',
    title: 'Şile Sahil Yolu',
    rideType: 'coast',
    startedAt: '2026-09-06T08:15:00+03:00',
    distanceKm: 68.4,
    durationMinutes: 95,
    averageSpeedKmh: 43,
    likeCount: 87,
    commentCount: 5,
    saveCount: 14,
    isLiked: false,
    isSaved: false,
    photos: [photos.coast, photos.forestRide],
    mapImage: rideMap,
  },
  {
    id: 'yasemin-kemer-sunset',
    riderId: 'yasemin-ozel',
    title: 'Kemer Günbatımı Sürüşü',
    rideType: 'longRide',
    startedAt: '2026-09-12T19:30:00+03:00',
    distanceKm: 12.8,
    durationMinutes: 88,
    averageSpeedKmh: 50,
    likeCount: 142,
    commentCount: 12,
    saveCount: 36,
    isLiked: false,
    isSaved: false,
    photos: [photos.mountainRoad, photos.mountainRoad],
    mapImage: rideMap,
  },
  {
    id: 'mert-geyikbayiri',
    riderId: 'mert-kaya',
    title: 'Geyikbayırı Virajları',
    rideType: 'curves',
    startedAt: '2026-10-08T08:15:00+03:00',
    distanceKm: 46.3,
    durationMinutes: 72,
    averageSpeedKmh: 39,
    likeCount: 58,
    commentCount: 3,
    saveCount: 0,
    isLiked: false,
    isSaved: false,
    photos: [photos.mountainRoad, photos.forestRide],
    mapImage: rideMap,
  },
  {
    id: 'mert-saklikent',
    riderId: 'mert-kaya',
    title: 'Saklıkent Kanyon Yolu',
    rideType: 'nature',
    startedAt: '2026-09-28T10:05:00+03:00',
    distanceKm: 92,
    durationMinutes: 125,
    averageSpeedKmh: 44,
    likeCount: 71,
    commentCount: 53,
    saveCount: 0,
    isLiked: false,
    isSaved: false,
    photos: [photos.forestRide],
    mapImage: rideMap,
  },
];

/** Viewer ↔ rider match per rider id. */
export const MATCH_FIXTURES: Readonly<Record<string, RiderMatch>> = {
  'deniz-kaya': { score: 92, sharedRouteCount: 3, reason: 'curvyRoads' },
  'yasemin-ozel': { score: 78, sharedRouteCount: 5, reason: 'coast' },
};
