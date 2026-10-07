import { useRider } from './queries';

/**
 * MOCK: the signed-in rider's profile. The mock account (yasemin@example.com) is Yasemin Özel
 * from the profile design (03.0 `Dimdp`); Supabase will return the session's own profile.
 */
export const MOCK_OWN_RIDER_ID = 'yasemin-ozel';

export function useOwnRider() {
  return useRider(MOCK_OWN_RIDER_ID);
}
