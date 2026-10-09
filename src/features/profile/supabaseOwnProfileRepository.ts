import { motorcycleBrandNames, type MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { findModel, MOTORCYCLE_MODELS } from '@/features/garage/fixtures/motorcycleModels';
import type { MotorcycleCategory } from '@/features/garage/types';
import { findCityByName } from '@/features/location/turkishCities';
import type { RegistrationDraft } from '@/features/registration/types';
import type { Place } from '@/features/route-suggestion/types';
import { i18n } from '@/i18n';
import { requireUserId, supabase, unwrap } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import { contentTypeOf, newObjectPath, publicUrl, removeFiles, uploadFile } from '@/lib/supabase/storage';

import {
  UsernameTakenError,
  type OwnBike,
  type OwnProfile,
  type OwnProfilePatch,
  type OwnProfileRepository,
} from './types';

/** `own_profile()` JSON (supabase/migrations/0005_accounts.sql). */
type OwnProfileRow = {
  userId: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  bio: string | null;
  city: string | null;
  followerCount: number;
  followingCount: number;
  rideCount: number;
  rideDistanceM: number;
  bike: {
    brand: string;
    modelId: string | null;
    model: string;
    year: number | null;
    displacementCc: number | null;
    category: string | null;
  } | null;
};

/** The bike as `complete_registration` / `set_primary_bike` take it. */
type BikePayload = {
  brand: MotorcycleBrand;
  modelId: string | null;
  model: string;
  year: number | null;
  displacementCc: number | null;
  category: MotorcycleCategory | null;
};

const COUNTRY = 'Türkiye';

const isBrand = (value: string): value is MotorcycleBrand => value in motorcycleBrandNames;

function toProfile(row: OwnProfileRow | null): OwnProfile {
  if (!row) {
    throw new Error('Own profile not found');
  }
  const bike = row.bike;
  return {
    userId: row.userId,
    name: row.name,
    handle: row.handle,
    avatarPath: row.avatarPath ?? undefined,
    photoUri: row.avatarPath ? publicUrl('avatars', row.avatarPath, 'card') : undefined,
    bio: row.bio ?? undefined,
    city: row.city ?? undefined,
    // A brand the app doesn't know has no logo or name to show.
    bike:
      bike && isBrand(bike.brand)
        ? {
            brand: bike.brand,
            model: bike.model,
            year: bike.year ?? undefined,
            modelId: bike.modelId ?? undefined,
            displacementCc: bike.displacementCc ?? undefined,
            category: (bike.category as MotorcycleCategory | null) ?? undefined,
          }
        : undefined,
    followerCount: row.followerCount,
    followingCount: row.followingCount,
    rideCount: row.rideCount,
    rideDistanceM: row.rideDistanceM,
  };
}

/** Fills catalog details (id, cc, class) the screen didn't pass from the model list. */
function bikePayload(bike: OwnBike): BikePayload {
  const model =
    findModel(bike.modelId) ??
    MOTORCYCLE_MODELS.find((item) => item.brand === bike.brand && item.name === bike.model);
  return {
    brand: bike.brand,
    modelId: bike.modelId ?? model?.id ?? null,
    model: bike.model,
    year: bike.year ?? null,
    displacementCc: bike.displacementCc ?? model?.displacementCc ?? null,
    category: bike.category ?? model?.category ?? null,
  };
}

/** "Kemer, Antalya, Türkiye" → "Antalya, Türkiye": the profile shows the province of the 04.02 place. */
function cityOf(place: Place) {
  const parts = [place.name, ...(place.subtitle?.split(',') ?? [])].map((part) => part.trim());
  const province = parts.map(findCityByName).find(Boolean)?.name;
  return province ? `${province}, ${COUNTRY}` : place.name;
}

/** `username_taken` from `complete_registration` / `update_own_profile` (SQLSTATE 23505). */
function rethrow(error: unknown): never {
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  if (cause?.code === '23505' || cause?.message === 'username_taken') {
    throw new UsernameTakenError();
  }
  throw error;
}

const isRemote = (uri: string) => /^https?:/.test(uri);

async function uploadAvatar(userId: string, uri: string) {
  return uploadFile('avatars', newObjectPath(userId, contentTypeOf(uri)), uri);
}

/** Deleting the replaced photo is housekeeping; the profile is already saved. */
function removeAvatar(path: string | null | undefined) {
  if (path) {
    removeFiles('avatars', [path]).catch(() => undefined);
  }
}

async function currentAvatarPath(userId: string) {
  const { data } = await supabase.from('profiles').select('avatar_path').eq('id', userId).maybeSingle();
  return data?.avatar_path ?? null;
}

/**
 * The own profile in Supabase (`own_profile`, `complete_registration`, `update_own_profile`,
 * `set_primary_bike`). Photos go to the public `avatars` bucket under the rider's folder; the
 * replaced one is deleted. Followers, following and ride totals are the server's counters.
 */
export const supabaseOwnProfileRepository: OwnProfileRepository = {
  async get() {
    const row = unwrap(await supabase.rpc('own_profile'));
    return toProfile(row as OwnProfileRow | null);
  },

  async saveFromRegistration(_session, draft: RegistrationDraft) {
    const userId = await requireUserId();
    const model = findModel(draft.modelId);
    // A retry after a failed `completeProfile` replaces the photo saved by the first attempt.
    const previousAvatar = draft.photoUri ? await currentAvatarPath(userId) : null;
    const avatarPath = draft.photoUri ? await uploadAvatar(userId, draft.photoUri) : undefined;
    const payload = {
      name: draft.fullName?.trim() || undefined,
      handle: draft.username?.trim() || undefined,
      avatarPath,
      city: draft.homePlace ? cityOf(draft.homePlace) : undefined,
      homePlace: draft.homePlace
        ? {
            id: draft.homePlace.id,
            name: draft.homePlace.name,
            subtitle: draft.homePlace.subtitle ?? null,
            coordinates: draft.homePlace.coordinates,
          }
        : undefined,
      bike:
        draft.brand && model
          ? bikePayload({
              brand: draft.brand,
              model: model.name,
              modelId: model.id,
              year: draft.modelYear,
            })
          : undefined,
      locale: i18n.language === 'en' ? 'en' : 'tr',
    };
    try {
      const row = unwrap(await supabase.rpc('complete_registration', { p: payload as Json }));
      removeAvatar(previousAvatar);
      return toProfile(row as OwnProfileRow | null);
    } catch (error) {
      // A failed save leaves no orphan photo; retrying uploads again.
      removeAvatar(avatarPath);
      rethrow(error);
    }
  },

  async update(session, patch: OwnProfilePatch) {
    const userId = await requireUserId();
    let row: OwnProfileRow | null = null;

    if ('bike' in patch) {
      const bike = patch.bike ? (bikePayload(patch.bike) as Json) : null;
      row = unwrap(await supabase.rpc('set_primary_bike', { p_bike: bike })) as OwnProfileRow | null;
    }

    // Keys present in the patch are written; `undefined` becomes null (cleared).
    const fields: Record<string, string | null> = {};
    for (const key of ['name', 'handle', 'bio', 'city'] as const) {
      if (key in patch) {
        // The name column is required: clearing it leaves an empty name.
        fields[key] = patch[key] ?? (key === 'name' ? '' : null);
      }
    }
    let previousAvatar: string | null = null;
    let newAvatar: string | undefined;
    // The current photo's URL comes back unchanged from the edit form; only a new file uploads.
    if ('photoUri' in patch && !(patch.photoUri && isRemote(patch.photoUri))) {
      previousAvatar = await currentAvatarPath(userId);
      newAvatar = patch.photoUri ? await uploadAvatar(userId, patch.photoUri) : undefined;
      fields.avatarPath = newAvatar ?? null;
    }

    if (Object.keys(fields).length > 0) {
      try {
        row = unwrap(await supabase.rpc('update_own_profile', { p: fields })) as OwnProfileRow | null;
      } catch (error) {
        removeAvatar(newAvatar);
        rethrow(error);
      }
      if (previousAvatar && previousAvatar !== newAvatar) {
        removeAvatar(previousAvatar);
      }
    }

    return row ? toProfile(row) : supabaseOwnProfileRepository.get(session);
  },

  // Deleting the account removes the profile on the server (cascade); nothing is kept locally.
  remove: async () => undefined,
};
