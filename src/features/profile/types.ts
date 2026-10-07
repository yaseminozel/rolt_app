import type { ImageSourcePropType } from 'react-native';

import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';

/** The signed-in rider's own profile (09.01). Name, bio and city are user content. */
export type OwnProfile = {
  userId: string;
  name: string;
  /** Username without "@". */
  handle: string;
  /** A photo the rider picked (registration 04.01 or the profile camera button). */
  photoUri?: string;
  /** MOCK: bundled avatar of the sample account. */
  sampleAvatar?: ImageSourcePropType;
  bio?: string;
  /** e.g. "Antalya, Türkiye". */
  city?: string;
  bike?: { brand: MotorcycleBrand; model: string; year?: number };
  followerCount: number;
  followingCount: number;
  /** MOCK: rider fixture whose sample rides join the feed (the design's sample account). */
  sampleRiderId?: string;
};
