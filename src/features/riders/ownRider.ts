import { useAuth } from '@/features/auth/AuthProvider';
import { hasSupabase } from '@/lib/supabase/client';

import { useRider } from './queries';

/**
 * MOCK: the signed-in rider's profile without Supabase. The mock account (yasemin@example.com)
 * is Yasemin Özel from the profile design (03.0 `Dimdp`).
 */
export const MOCK_OWN_RIDER_ID = 'yasemin-ozel';

/**
 * The signed-in viewer's rider id: the Supabase user id (profiles share the auth user's id), or
 * the sample rider in mock mode. Undefined for guests.
 */
export function useOwnRiderId(): string | undefined {
  const { session } = useAuth();
  if (!session) {
    return undefined;
  }
  return hasSupabase ? session.userId : MOCK_OWN_RIDER_ID;
}

export function useOwnRider() {
  return useRider(useOwnRiderId());
}
