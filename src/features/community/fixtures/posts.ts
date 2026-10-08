import type { CommunityAuthor, CommunityComment, CommunityPost, SearchPlaceResult } from '../types';

/**
 * MOCK DATA until Supabase. People, posts and comments are the design's samples (13.01
 * `1005:39834`, 13.02 `1005:39609`, 13.04 `1005:39756`); photos reuse the bundled route photos.
 */
const photos = {
  mountainRoad: require('../../../../assets/images/routes/route-mountain-road.jpg'),
  coast: require('../../../../assets/images/routes/route-coast.jpg'),
  forestRide: require('../../../../assets/images/routes/route-forest-ride.jpg'),
  desertRider: require('../../../../assets/images/routes/route-desert-rider.jpg'),
};
const rideMap = require('../../../../assets/images/maps/route-map-fallback.jpg');

export const COMMUNITY_AUTHORS = {
  mert: { id: 'mert-kaya', name: 'Mert Kaya', handle: 'mertkaya', bike: 'Yamaha MT-07' },
  burak: { id: 'burak-sen', name: 'Burak Şen', handle: 'buraksen', bike: 'Honda CB650R' },
  elif: { id: 'elif-arslan', name: 'Elif Arslan', handle: 'elifarslan', bike: 'Kawasaki Z650' },
  ayse: { id: 'ayse-demir', name: 'Ayşe Demir', handle: 'aysedemir', bike: 'Honda NC750X' },
  can: { id: 'can-yildiz', name: 'Can Yıldız', handle: 'canyildiz', bike: 'KTM 390 Duke' },
  kaan: { id: 'kaan-aksoy', name: 'Kaan Aksoy', handle: 'kaanaksoy', bike: 'Suzuki V-Strom 650' },
  kasRiders: { id: 'kas-riders', name: 'Kaş Riders', handle: 'kasriders', bike: 'BMW R 1250 GS' },
} satisfies Record<string, CommunityAuthor>;

/** Today / yesterday at a clock time, so the samples read "Bugün, 08:15" and "Dün, 17:40". */
function at(daysAgo: number, hours: number, minutes: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function initialPosts(): CommunityPost[] {
  return [
    {
      id: 'post-geyikbayiri',
      author: COMMUNITY_AUTHORS.mert,
      createdAt: at(0, 8, 15),
      ride: {
        title: 'Geyikbayırı Virajları',
        description: 'Sabah serinliğinde virajlar bomboştu, asfalt yeni.',
        rideType: 'curves',
        distanceKm: 46.3,
        durationMinutes: 72,
        averageSpeedKmh: 39,
        mapImage: rideMap,
      },
      photos: [photos.mountainRoad, photos.forestRide],
      likeCount: 58,
      commentCount: 3,
      isLiked: false,
      audience: 'public',
    },
    {
      id: 'post-bolu',
      author: COMMUNITY_AUTHORS.burak,
      createdAt: at(0, 9, 42),
      text: "Hafta sonu Bolu Dağı'na çıkacak olan var mı? Cumartesi 07:00'de Kartal'dan çıkıyoruz, dönüşte Abant'ta kahvaltı molası vereceğiz. Tempo sakin, yeni başlayanlar da gelebilir. Yakıt molası Gerede'de, toplam yaklaşık 420 km. Yağmur ihtimaline karşı yağmurluk almayı unutmayın; hava kötüleşirse rotayı kısaltıp Mudurnu üzerinden döneriz.",
      photos: [],
      likeCount: 24,
      commentCount: 0,
      isLiked: false,
      audience: 'public',
    },
    {
      id: 'post-polonezkoy',
      author: COMMUNITY_AUTHORS.elif,
      createdAt: at(1, 18, 5),
      text: 'Polonezköy yolunda sabah sürüşü. Ağaçların arası serin, yol bomboş.',
      photos: [photos.forestRide, photos.mountainRoad, photos.coast, photos.desertRider],
      likeCount: 212,
      commentCount: 0,
      isLiked: false,
      audience: 'public',
    },
    {
      id: 'post-kas-kalkan',
      author: COMMUNITY_AUTHORS.ayse,
      createdAt: at(1, 17, 40),
      text: 'Gün batımına yetiştik, üç mola verdik.',
      ride: {
        title: 'Kaş – Kalkan Sahil Yolu',
        rideType: 'coast',
        distanceKm: 27.4,
        durationMinutes: 41,
        averageSpeedKmh: 40,
        mapImage: rideMap,
      },
      photos: [photos.coast, photos.desertRider],
      likeCount: 46,
      commentCount: 0,
      isLiked: false,
      audience: 'public',
    },
  ];
}

export function initialComments(): CommunityComment[] {
  return [
    {
      id: 'comment-1',
      postId: 'post-geyikbayiri',
      author: COMMUNITY_AUTHORS.ayse,
      createdAt: minutesAgo(120),
      text: 'Bu saatte Geyikbayırı efsane. Asfalt nasıldı, çakıl var mıydı?',
    },
    {
      id: 'comment-2',
      postId: 'post-geyikbayiri',
      author: COMMUNITY_AUTHORS.mert,
      createdAt: minutesAgo(60),
      text: 'Yeni asfalt döküldü, tertemiz. Sadece son 2 km’de dikkat.',
    },
    {
      id: 'comment-3',
      postId: 'post-geyikbayiri',
      author: COMMUNITY_AUTHORS.can,
      createdAt: minutesAgo(35),
      text: 'Hafta sonu ben de gideceğim, rotayı kaydettim.',
    },
  ];
}

/** Places the search knows, with how many shared rides start there. */
export const COMMUNITY_PLACES: readonly SearchPlaceResult[] = [
  { kind: 'place', id: 'kas', name: 'Kaş, Antalya', rideCount: 38 },
  { kind: 'place', id: 'kemer', name: 'Kemer, Antalya', rideCount: 24 },
  { kind: 'place', id: 'olimpos', name: 'Olimpos, Antalya', rideCount: 12 },
  { kind: 'place', id: 'bolu', name: 'Bolu', rideCount: 9 },
];
