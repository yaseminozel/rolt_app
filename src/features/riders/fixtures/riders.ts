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

export const RIDER_FIXTURES: readonly Rider[] = [
  {
    id: 'deniz-kaya',
    name: 'Deniz Kaya',
    handle: 'denizrides',
    avatar: require('../../../../assets/images/avatars/deniz-kaya.jpg'),
    bio: 'Hafta sonları sahil yolları, pazar sabahları kahve sürüşleri.',
    city: 'İstanbul, Türkiye',
    bikes: [
      { id: 'deniz-mt-07', brand: 'yamaha', model: 'MT-07', year: 2022, displacementCc: 689, category: 'naked', isPrimary: true },
      { id: 'deniz-tenere', brand: 'yamaha', model: 'Ténéré 700', year: 2019, displacementCc: 689, category: 'adventure', isPrimary: false },
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
      { id: 'yasemin-pulsar', brand: 'bajaj', model: 'Pulsar N250', displacementCc: 249, category: 'naked', isPrimary: true },
    ],
    followerCount: 1284,
    followingCount: 903,
    isFollowing: false,
  },
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
];

/** Viewer ↔ rider match per rider id. */
export const MATCH_FIXTURES: Readonly<Record<string, RiderMatch>> = {
  'deniz-kaya': { score: 92, sharedRouteCount: 3, reason: 'curvyRoads' },
  'yasemin-ozel': { score: 78, sharedRouteCount: 5, reason: 'coast' },
};
