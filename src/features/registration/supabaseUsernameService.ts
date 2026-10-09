import { supabase, unwrap } from '@/lib/supabase/client';

import {
  buildUsernameSuggestionCandidates,
  USERNAME_SUGGESTION_LIMIT,
  type UsernameService,
} from './usernameService';

/**
 * Username availability in one `free_usernames` call: the typed name first, then the suggestion
 * candidates. The rider's own current handle counts as free (09.05 keeps it).
 */
export const supabaseUsernameService: UsernameService = {
  async checkAvailability(username, hints) {
    const candidates = buildUsernameSuggestionCandidates(username, hints);
    const free =
      unwrap(await supabase.rpc('free_usernames', { p_candidates: [username, ...candidates] })) ?? [];
    if (free.includes(username)) {
      return { available: true };
    }
    return {
      available: false,
      suggestions: free.filter((candidate) => candidate !== username).slice(0, USERNAME_SUGGESTION_LIMIT),
    };
  },
};
