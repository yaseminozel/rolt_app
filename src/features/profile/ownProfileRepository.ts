import { MOTORCYCLE_MODELS } from '@/features/garage/fixtures/motorcycleModels';
import type { Session } from '@/features/auth/types';
import type { RegistrationDraft } from '@/features/registration/types';
import { RIDER_FIXTURES } from '@/features/riders/fixtures/riders';
import { MOCK_OWN_RIDER_ID } from '@/features/riders/ownRider';
import { deviceStore } from '@/lib/deviceStore';

import type { OwnProfile } from './types';

const key = (userId: string) => `rolt.profile.${userId}`;

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
 * MOCK own profile, stored on the device per account until Supabase profiles exist. Accounts
 * without registration data show the design's profile (09.01 `Ct2Yd`, the fixture rider);
 * registered accounts get their own from 04.01–04.03.
 */
export const ownProfileRepository = {
  async get(session: Session): Promise<OwnProfile> {
    const stored = await read(session.userId);
    const sample = sampleProfile(session);
    if (!stored) {
      return sample;
    }
    // The sample avatar is bundled, so it is restored rather than stored.
    return stored.sampleRiderId ? { ...stored, sampleAvatar: sample.sampleAvatar } : stored;
  },

  /**
   * A finished registration (04.01–04.03) makes the account its own rider: the entered name,
   * username, photo, place and bike, no followers or rides yet (09.01 "Yeni kullanıcı"). If every
   * step was skipped there is nothing to show, so the account keeps the design's sample profile.
   */
  async saveFromRegistration(session: Session, draft: RegistrationDraft) {
    const model = MOTORCYCLE_MODELS.find((item) => item.id === draft.modelId);
    const name = draft.fullName?.trim();
    const handle = draft.username?.trim();
    if (!name && !handle && !draft.photoUri && !draft.homePlace && !model) {
      return ownProfileRepository.get(session);
    }
    const sample = sampleProfile(session);
    const profile: OwnProfile = {
      userId: session.userId,
      name: name || sample.name,
      handle: handle || session.email.split('@')[0] || sample.handle,
      photoUri: draft.photoUri,
      city: draft.homePlace?.name,
      bike:
        draft.brand && model
          ? { brand: draft.brand, model: model.name, year: draft.modelYear }
          : undefined,
      followerCount: 0,
      followingCount: 0,
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
