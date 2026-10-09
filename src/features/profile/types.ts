import type { ImageSourcePropType } from 'react-native';

import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import type { Session } from '@/features/auth/types';
import type { MotorcycleCategory } from '@/features/garage/types';
import type { RegistrationDraft } from '@/features/registration/types';

/** The rider's primary bike (Motorum, Akış 17). */
export type OwnBike = {
  brand: MotorcycleBrand;
  model: string;
  year?: number;
  /** Catalog id (`garage/fixtures/motorcycleModels`) when picked from the list. */
  modelId?: string;
  displacementCc?: number;
  category?: MotorcycleCategory;
};

/** The signed-in rider's own profile (09.01). Name, bio and city are user content. */
export type OwnProfile = {
  userId: string;
  /** May be empty: every registration step can be skipped. */
  name: string;
  /** Username without "@"; empty until the rider picks one. */
  handle: string;
  /**
   * The profile photo: a local file the rider just picked, or (Supabase) the stored avatar's URL.
   * Patching it with a local file uploads it.
   */
  photoUri?: string;
  /** Supabase: storage path of the avatar in the `avatars` bucket. */
  avatarPath?: string;
  /** MOCK: bundled avatar of the sample account. */
  sampleAvatar?: ImageSourcePropType;
  bio?: string;
  /** e.g. "Antalya, Türkiye". */
  city?: string;
  bike?: OwnBike;
  followerCount: number;
  followingCount: number;
  /** Supabase: the rider's rides on the server and their total distance. */
  rideCount?: number;
  rideDistanceM?: number;
  /** MOCK: rider fixture whose sample rides join the feed (the design's sample account). */
  sampleRiderId?: string;
};

/** Fields of the own profile a screen can change (09.01 camera, 09.05, Motorum). */
export type OwnProfilePatch = Partial<
  Pick<OwnProfile, 'name' | 'handle' | 'photoUri' | 'bio' | 'city' | 'bike'>
>;

/** Backend contract of the own profile; the mock keeps it on the device. */
export interface OwnProfileRepository {
  get(session: Session): Promise<OwnProfile>;
  /** 04.07: saves the registration answers (any of them may be missing) and finishes the profile. */
  saveFromRegistration(session: Session, draft: RegistrationDraft): Promise<OwnProfile>;
  /** Keys present in the patch are written; `undefined` clears the field (`bike` removes it). */
  update(session: Session, patch: OwnProfilePatch): Promise<OwnProfile>;
  /** 10.16 Hesabı sil: forgets this device's copy of the account's profile. */
  remove(userId: string): Promise<void>;
}

/** The chosen username was taken in the meantime (04.07 / 09.05). */
export class UsernameTakenError extends Error {
  constructor() {
    super('username_taken');
    this.name = 'UsernameTakenError';
  }
}
