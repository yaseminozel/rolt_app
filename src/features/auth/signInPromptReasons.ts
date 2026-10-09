import { firstParam } from './credentials';

/**
 * Account-only actions that open the guest sign-in prompt (00.15 "Misafir / Giriş gerekli").
 * Each reason gets its own copy under `auth:signInPrompt.reasons.<reason>` and an icon in the
 * sheet; unknown or missing reasons fall back to `auth:signInPrompt.generic`.
 * Add a reason here, then its copy (tr + en) and icon.
 */
export const SIGN_IN_PROMPT_REASONS = [
  'saveRoute',
  'followRider',
  'likeRide',
  'commentRide',
  'saveRide',
  'reportContent',
  'blockRider',
  'suggestRoute',
  'sharePost',
] as const;

export type SignInPromptReason = (typeof SIGN_IN_PROMPT_REASONS)[number];

export function parseSignInPromptReason(
  value: string | string[] | undefined,
): SignInPromptReason | null {
  const reason = firstParam(value);
  return (SIGN_IN_PROMPT_REASONS as readonly string[]).includes(reason)
    ? (reason as SignInPromptReason)
    : null;
}
