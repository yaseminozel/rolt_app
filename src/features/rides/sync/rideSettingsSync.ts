import {
  readEndpointPrivacy,
  storeEndpointPrivacy,
  type EndpointPrivacy,
} from '@/features/settings/privacySettings';
import { supabase, unwrap } from '@/lib/supabase/client';

import { readDefaultVisibility, storeDefaultVisibility } from '../visibilityPreference';
import { RIDE_VISIBILITIES } from '../types';
import { clearRideSettingsDirty, readRideSettingsDirty } from './settingsChanges';

const DISTANCES: readonly EndpointPrivacy['distanceM'][] = [100, 250, 500, 1000];

/**
 * Ride visibility (10.04) and start / finish privacy (10.05) between this device and
 * `user_settings`: changes made here are pushed (until then the device copy wins); otherwise the
 * account's values replace the device copy, e.g. after switching accounts. Resolves true when
 * the device copy changed.
 */
export async function syncRideSettings(userId: string): Promise<boolean> {
  const dirty = await readRideSettingsDirty();
  if (dirty && (dirty.ownerId === null || dirty.ownerId === userId)) {
    const patch: { default_ride_visibility?: string; hide_endpoints?: boolean; endpoint_distance_m?: number } = {};
    if (dirty.fields.includes('visibility')) {
      patch.default_ride_visibility = await readDefaultVisibility();
    }
    if (dirty.fields.includes('endpoints')) {
      const privacy = await readEndpointPrivacy();
      patch.hide_endpoints = privacy.hidden;
      patch.endpoint_distance_m = privacy.distanceM;
    }
    unwrap(await supabase.from('user_settings').update(patch).eq('user_id', userId));
    // Another change while pushing is pushed by the next pass.
    const after = await readRideSettingsDirty();
    if (after?.version === dirty.version) {
      await clearRideSettingsDirty();
    }
    return false;
  }

  const row = unwrap(
    await supabase
      .from('user_settings')
      .select('default_ride_visibility, hide_endpoints, endpoint_distance_m')
      .eq('user_id', userId)
      .maybeSingle(),
  );
  // A change of the rider while reading wins; another account's unsent change is dropped.
  const latest = await readRideSettingsDirty();
  if (!row || (latest && latest.version !== dirty?.version)) {
    return false;
  }
  if (dirty) {
    await clearRideSettingsDirty();
  }

  let changed = false;
  const visibility = RIDE_VISIBILITIES.find((item) => item === row.default_ride_visibility);
  if (visibility && visibility !== (await readDefaultVisibility())) {
    await storeDefaultVisibility(visibility);
    changed = true;
  }
  const distanceM = DISTANCES.find((item) => item === row.endpoint_distance_m);
  const current = await readEndpointPrivacy();
  if (distanceM && (current.hidden !== row.hide_endpoints || current.distanceM !== distanceM)) {
    await storeEndpointPrivacy({ hidden: row.hide_endpoints, distanceM });
    changed = true;
  }
  return changed;
}
