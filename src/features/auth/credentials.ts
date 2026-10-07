import type { SocialProvider } from './types';

/** Minimum password length shown on 02.02 "Yeni hesap" ("En az 8 karakter.") and 02.05. */
export const MIN_PASSWORD_LENGTH = 8;

/** Password sign-in pause after too many wrong attempts; stated on 02.02 "Çok fazla deneme" (`rjPx3`). */
export const LOCK_DURATION_MINUTES = 15;

/**
 * Rule for a changed password (10.03 "En az 8 karakter, bir rakam ve bir büyük harf."). Sign-up
 * (02.02) still asks only for the length, as drawn there.
 */
export function isStrongPassword(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH && /\d/.test(password) && /[A-ZÇĞİÖŞÜ]/.test(password)
  );
}

/** How long a password reset link stays valid; stated on "Bağlantının süresi dolmuş". */
export const RESET_LINK_VALIDITY_MINUTES = 30;

/** How long an email verification link stays valid; stated on 02.07 "Süresi dolmuş bağlantı". */
export const VERIFICATION_LINK_VALIDITY_HOURS = 24;

/** 00.3 password step: sign in to an existing password account or create a new one. */
export type PasswordMode = 'existing' | 'new';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Loose client-side format check before the lookup; the backend stays the authority. */
export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email.trim());
}

const MASK = '••••';

/**
 * Masks the local part like the design's "yas••••@gmail.com" (02.04 `U9gRlP`): the first three
 * characters stay, the rest becomes a fixed four-bullet run so the length isn't revealed.
 * Local parts of three characters or fewer keep only their first character.
 */
export function maskEmail(email: string) {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) {
    return trimmed;
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const visible = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
  return `${visible}${MASK}${domain}`;
}

/** Expo Router search params can arrive as arrays; screens only need the first value. */
export function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function parsePasswordMode(value: string | string[] | undefined): PasswordMode | null {
  const mode = firstParam(value);
  return mode === 'existing' || mode === 'new' ? mode : null;
}

export function parseSocialProvider(value: string | string[] | undefined): SocialProvider | null {
  const provider = firstParam(value);
  return provider === 'google' || provider === 'apple' ? provider : null;
}
