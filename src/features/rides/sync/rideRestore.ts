import type { LngLat, RoadSurface, RouteDifficulty } from '@/features/routes/types';
import type { Json } from '@/lib/supabase/database.types';
import { supabase, unwrap } from '@/lib/supabase/client';
import { publicUrl } from '@/lib/supabase/storage';

import { RIDE_TYPES, type RideType } from '../rideTypes';
import { rideStorage } from '../storage';
import { RIDE_VISIBILITIES, type RideRecord } from '../types';
import { readPendingDeletes } from './pendingDeletes';

const DIFFICULTIES: readonly RouteDifficulty[] = ['easy', 'moderate', 'hard'];
const SURFACES: readonly RoadSurface[] = ['asphalt', 'mixed', 'gravel'];

/** A row of `own_rides_for_restore` (0003_rides.sql: `ride_summary_json` plus the full track). */
type RestoredRideJson = {
  id: string;
  title?: string | null;
  notes?: string | null;
  rideType?: string;
  difficulty?: string;
  surface?: string;
  visibility?: string;
  routeId?: string | null;
  routeName?: string | null;
  city?: string | null;
  startedAt: string;
  endedAt?: string | null;
  updatedAt?: string | null;
  distanceM?: number;
  durationS?: number;
  breakS?: number;
  breakCount?: number;
  maxSpeedMps?: number;
  curveCount?: number;
  maxLeanLeftDeg?: number | null;
  maxLeanRightDeg?: number | null;
  photoPaths?: string[] | null;
  track?: LngLat[][] | null;
};

const pick = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  values.find((item) => item === value) ?? fallback;

/** One restored ride as a saved, synced device record of `ownerId`. */
export function rideFromRestore(json: RestoredRideJson, ownerId: string): RideRecord {
  const startedAt = Date.parse(json.startedAt);
  const endedAt = json.endedAt ? Date.parse(json.endedAt) : undefined;
  const uploadedAt = json.updatedAt ? Date.parse(json.updatedAt) : Date.now();
  return {
    id: json.id,
    status: 'saved',
    ownerId,
    rideType: pick<RideType>(RIDE_TYPES, json.rideType, 'city'),
    routeId: json.routeId ?? undefined,
    routeName: json.routeName ?? undefined,
    title: json.title ?? '',
    notes: json.notes ?? '',
    difficulty: pick(DIFFICULTIES, json.difficulty, 'moderate'),
    surface: pick(SURFACES, json.surface, 'asphalt'),
    visibility: pick(RIDE_VISIBILITIES, json.visibility, 'private'),
    photos: (json.photoPaths ?? []).map((path, index) => ({
      id: `photo-${json.id}-${index}`,
      uri: publicUrl('ride-photos', path),
      status: 'uploaded',
      progress: 1,
      path,
    })),
    city: json.city ?? undefined,
    startedAt,
    endedAt,
    updatedAt: uploadedAt,
    stats: {
      distanceM: json.distanceM ?? 0,
      durationS: json.durationS ?? 0,
      breakS: json.breakS ?? 0,
      breakCount: json.breakCount ?? 0,
      maxSpeedMps: json.maxSpeedMps ?? 0,
      curveCount: json.curveCount ?? 0,
      maxLeanLeftDeg: json.maxLeanLeftDeg ?? undefined,
      maxLeanRightDeg: json.maxLeanRightDeg ?? undefined,
    },
    track: json.track ?? [],
    synced: true,
    uploadedAt,
  };
}

/**
 * A new device (or a reinstall): the account's rides the device doesn't have come back as saved
 * and synced. Rides already here (any state, any owner) and rides deleted here but not yet on the
 * server are left out, and a ride is only written if its id is still new. Resolves with the
 * number of rides added.
 */
export async function restoreRides(ownerId: string): Promise<number> {
  const [ids, pending] = await Promise.all([rideStorage.ids(), readPendingDeletes()]);
  const known = [...ids, ...pending.map((item) => item.id)];
  const rows = unwrap(await supabase.rpc('own_rides_for_restore', { p_known_ids: known }));
  let added = 0;
  for (const row of (rows ?? []) as Json[]) {
    const json = row as unknown as RestoredRideJson;
    if (!json?.id || !json.startedAt) {
      continue;
    }
    if (await rideStorage.insertIfAbsent(rideFromRestore(json, ownerId))) {
      added += 1;
    }
  }
  return added;
}
