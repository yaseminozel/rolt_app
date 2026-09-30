import type { SocialProvider } from './types';

/** Minimum password length shown on 00.3 "Yeni Hesap" ("En az 8 karakter.") and 00.6. */
export const MIN_PASSWORD_LENGTH = 8;

/** How long a password reset link stays valid; stated on 00.6 "Bağlantının süresi dolmuş". */
export const RESET_LINK_VALIDITY_MINUTES = 30;

/** 00.3 password step: sign in to an existing password account or create a new one. */
export type PasswordMode = 'existing' | 'new';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Loose client-side format check before the lookup; the backend stays the authority. */
export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email.trim());
}

const MASK = '••••';

/**
 * Masks the local part like the design's "yas••••@gmail.com" (AQCUg): the first three
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

/** Epoch-millisecond route param (e.g. `lockedUntil`, `sentAt`) → Date, or null when missing/invalid. */
export function parseTimestampParam(value: string | string[] | undefined): Date | null {
  const raw = firstParam(value);
  const ms = raw ? Number(raw) : NaN;
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/** Date → route param counterpart of `parseTimestampParam`. */
export const toTimestampParam = (date: Date) => String(date.getTime());
