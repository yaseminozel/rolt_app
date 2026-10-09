import { hasSupabase } from '@/lib/supabase/client';

import { mockOwnProfileRepository } from './mockOwnProfileRepository';
import { supabaseOwnProfileRepository } from './supabaseOwnProfileRepository';
import type { OwnProfileRepository } from './types';

/** The own profile: Supabase when configured, otherwise the on-device mock (Expo Go demos). */
export const ownProfileRepository: OwnProfileRepository = hasSupabase
  ? supabaseOwnProfileRepository
  : mockOwnProfileRepository;
