/** Username rules on 00.8: lowercase letters, digits, underscore and dot. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_ALLOWED = /^[a-z0-9_.]*$/;

export type UsernameFormatError = 'invalidCharacters' | 'tooShort' | 'tooLong';

/** Local format check; `null` when the username may be sent for an availability check. */
export function validateUsernameFormat(username: string): UsernameFormatError | null {
  if (!USERNAME_ALLOWED.test(username)) return 'invalidCharacters';
  if (username.length < USERNAME_MIN_LENGTH) return 'tooShort';
  if (username.length > USERNAME_MAX_LENGTH) return 'tooLong';
  return null;
}

/**
 * Backend contract for username availability. The mock below is swapped for the
 * self-hosted Supabase implementation later.
 */
export interface UsernameService {
  isAvailable(username: string): Promise<boolean>;
}

const NETWORK_DELAY_MS = 400;
/** MOCK: usernames treated as taken until a real profile table exists. */
const TAKEN_USERNAMES = new Set(['yasemin', 'rolt', 'admin']);

export const mockUsernameService: UsernameService = {
  async isAvailable(username) {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
    return !TAKEN_USERNAMES.has(username);
  },
};
