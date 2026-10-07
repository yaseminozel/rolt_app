import { MOTORCYCLE_MODELS } from '@/features/garage/fixtures/motorcycleModels';
import type { Session } from '@/features/auth/types';
import type { RegistrationDraft } from '@/features/registration/types';
import { RIDER_FIXTURES } from '@/features/riders/fixtures/riders';
import { MOCK_OWN_RIDER_ID } from '@/features/riders/ownRider';
import { deviceStore } from '@/lib/deviceStore';

import type { OwnProfile } from './types';

const key = (userId: string) => `rolt.profile.${userId}`;
/** MOCK: the design's sample account; its profile is the fixture rider until it is edited. */
const SAMPLE_EMAIL = 'yasemin@example.com';

function sampleProfile(session: Session): OwnProfile {
  const rider = RIDER_FIXTURES.find((item) => item.id === MOCK_OWN_RIDER_ID)!;
  const bike = rider.bikes.find((item) => item.isPrimary) ?? rider.bikes[0];
  return {
    userId: session.userId,
    name: rider.name,
    handle: rider.handle,
    sampleAvatar: rider.avatar,
    bio: rider.bio,
    city: rider.city,
    bike: bike ? { brand: bike.brand, model: bike.model, year: bike.year } : undefined,
    followerCount: rider.followerCount,
    followingCount: rider.followingCount,
    sampleRiderId: rider.id,
  };
}

/** A profile from the email alone, for accounts that skipped registration. */
function fallbackProfile(session: Session): OwnProfile {
  const local = session.email.split('@')[0] ?? '';
  return {
    userId: session.userId,
    name: local,
    handle: local,
    followerCount: 0,
    followingCount: 0,
  };
}

async function read(userId: string) {
  const raw = await deviceStore.get(key(userId));
  return raw ? (JSON.parse(raw) as OwnProfile) : null;
}

async function write(profile: OwnProfile) {
  // The bundled sample avatar can't be serialised; it is restored from the fixture on read.
  const { sampleAvatar: _sampleAvatar, ...stored } = profile;
  await deviceStore.set(key(profile.userId), JSON.stringify(stored));
}

/**
 * MOCK own profile, stored on the device per account until Supabase profiles exist. New
 * accounts get theirs from registration (04.01–04.03); the sample account starts as the
 * fixture rider from the profile design.
 */
export const ownProfileRepository = {
  async get(session: Session): Promise<OwnProfile> {
    const stored = await read(session.userId);
    if (session.email === SAMPLE_EMAIL) {
      const sample = sampleProfile(session);
      return stored ? { ...sample, ...stored, sampleAvatar: sample.sampleAvatar } : sample;
    }
    return stored ?? fallbackProfile(session);
  },

  async saveFromRegistration(session: Session, draft: RegistrationDraft) {
    const base = await ownProfileRepository.get(session);
    const model = MOTORCYCLE_MODELS.find((item) => item.id === draft.modelId);
    const profile: OwnProfile = {
      ...base,
      name: draft.fullName?.trim() || base.name,
      handle: draft.username?.trim() || base.handle,
      photoUri: draft.photoUri ?? base.photoUri,
      city: draft.homePlace?.name ?? base.city,
      bike:
        draft.brand && model
          ? { brand: draft.brand, model: model.name, year: draft.modelYear }
          : base.bike,
    };
    await write(profile);
    return profile;
  },

  async update(session: Session, patch: Partial<OwnProfile>) {
    const profile = { ...(await ownProfileRepository.get(session)), ...patch };
    await write(profile);
    return profile;
  },
};
