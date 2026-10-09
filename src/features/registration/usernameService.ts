/** Username rules on 00.8: lowercase letters, digits, underscore and dot. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_ALLOWED = /^[a-z0-9_.]*$/;

/** Maximum suggestion chips under a taken username (eIU92 shows three). */
export const USERNAME_SUGGESTION_LIMIT = 3;

export type UsernameFormatError = 'invalidCharacters' | 'tooShort' | 'tooLong';

/** Local format check; `null` when the username may be sent for an availability check. */
export function validateUsernameFormat(username: string): UsernameFormatError | null {
  if (!USERNAME_ALLOWED.test(username)) return 'invalidCharacters';
  if (username.length < USERNAME_MIN_LENGTH) return 'tooShort';
  if (username.length > USERNAME_MAX_LENGTH) return 'tooLong';
  return null;
}

/** Profile data already known during registration, used to personalise suggestions. */
export type UsernameSuggestionHints = {
  /** Plate code of the chosen city, e.g. "34" for İstanbul. */
  cityPlateCode?: string;
  /** Bike model name, e.g. "MT-07" (only known when the user came back from a later step). */
  bikeModelName?: string;
};

export type UsernameAvailability =
  | { available: true }
  /** `suggestions` are free alternatives (at most `USERNAME_SUGGESTION_LIMIT`), best first. */
  | { available: false; suggestions: string[] };

/**
 * Backend contract for username availability: the mock below (no Supabase configured) and
 * `supabaseUsernameService`, which checks all candidates in one query.
 */
export interface UsernameService {
  checkAvailability(username: string, hints?: UsernameSuggestionHints): Promise<UsernameAvailability>;
}

/** Brand-flavoured suffix of the first suggestion (eIU92 "@yasemin.rides"). */
const RIDES_SUFFIX = '.rides';
/** Short suffix used when no bike model is known. */
const FALLBACK_SUFFIX = 'moto';
/** Longest bike slug worth appending ("mt07", "r1250gs"). */
const MAX_BIKE_SLUG_LENGTH = 7;

/**
 * Suggestion candidates for a taken username, best first (eIU92):
 * 1. `base.rides`
 * 2. `base_<city plate code>`, or `base_<2 random digits>` without a city
 * 3. `base<bike model>` ("mt07"), or `base` + a short suffix without a bike
 * then random-digit fallbacks in case the preferred ones are taken too.
 * The base is shortened so every candidate fits `USERNAME_MAX_LENGTH`; candidates that break
 * the username rules or equal the input are dropped. Availability is checked by the service.
 */
export function buildUsernameSuggestionCandidates(
  username: string,
  hints: UsernameSuggestionHints = {},
  random: () => number = Math.random,
): string[] {
  const twoDigits = () => String(Math.floor(random() * 90) + 10);
  const threeDigits = () => String(Math.floor(random() * 900) + 100);
  const bikeSlug = toSlug(hints.bikeModelName ?? '');
  const shortSuffix =
    bikeSlug.length > 0 && bikeSlug.length <= MAX_BIKE_SLUG_LENGTH ? bikeSlug : FALLBACK_SUFFIX;

  const suffixes = [
    RIDES_SUFFIX,
    `_${hints.cityPlateCode ?? twoDigits()}`,
    shortSuffix,
    `_${twoDigits()}`,
    twoDigits(),
    `.${shortSuffix === FALLBACK_SUFFIX ? threeDigits() : FALLBACK_SUFFIX}`,
    threeDigits(),
  ];

  const candidates = suffixes.map((suffix) => withSuffix(username, suffix));
  return [...new Set(candidates)].filter(
    (candidate) => candidate !== username && validateUsernameFormat(candidate) === null,
  );
}

/** Joins base and suffix, trimming the base (and any separator it ends with) to fit the max length. */
function withSuffix(base: string, suffix: string): string {
  let trimmed = base.slice(0, USERNAME_MAX_LENGTH - suffix.length);
  if (/^[._]/.test(suffix)) {
    trimmed = trimmed.replace(/[._]+$/, '');
  }
  return trimmed + suffix;
}

/** "MT-07" → "mt07": keeps only characters allowed in usernames (separators dropped). */
function toSlug(value: string): string {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]/g, '');
}

const NETWORK_DELAY_MS = 400;
/** MOCK: usernames treated as taken without a backend. */
const TAKEN_USERNAMES = new Set(['yasemin', 'rolt', 'admin']);

export const mockUsernameService: UsernameService = {
  async checkAvailability(username, hints) {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
    if (!TAKEN_USERNAMES.has(username)) {
      return { available: true };
    }
    const suggestions = buildUsernameSuggestionCandidates(username, hints)
      .filter((candidate) => !TAKEN_USERNAMES.has(candidate))
      .slice(0, USERNAME_SUGGESTION_LIMIT);
    return { available: false, suggestions };
  },
};
