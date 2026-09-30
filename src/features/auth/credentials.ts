import type { EmailLookupResult } from './types';

/** Minimum password length shown on 00.3 "Yeni Hesap" ("En az 8 karakter.") and 00.6. */
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Loose client-side check that only gates the CTA; the backend stays the authority. */
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

export function parseLookupMode(value: string | string[] | undefined): EmailLookupResult | null {
  const mode = firstParam(value);
  return mode === 'existing' || mode === 'new' ? mode : null;
}
