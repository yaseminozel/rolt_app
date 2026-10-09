// Unsubscribe links for marketing emails. The token is the address plus an HMAC of it (keyed with
// the internal secret), so a link only works for the address it was sent to and needs no table.

import { env } from './env.ts';

const encoder = new TextEncoder();

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

async function signature(email: string) {
  if (!env.internalSecret) {
    throw new Error('INTERNAL_HOOK_SECRET is not set');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`unsubscribe:${env.internalSecret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(email))));
}

export async function unsubscribeToken(email: string) {
  const normalized = email.trim().toLowerCase();
  return `${base64Url(encoder.encode(normalized))}.${await signature(normalized)}`;
}

/** The address a token was made for, or null when it was altered. */
export async function verifyUnsubscribeToken(token: string) {
  const [payload, given] = token.split('.');
  if (!payload || !given) {
    return null;
  }
  try {
    const email = new TextDecoder().decode(fromBase64Url(payload));
    const expected = await signature(email);
    if (expected.length !== given.length) {
      return null;
    }
    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) {
      diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
    }
    return diff === 0 ? email : null;
  } catch {
    return null;
  }
}

/** Link for the footer and the List-Unsubscribe header (served by the `unsubscribe` function). */
export async function unsubscribeUrl(email: string) {
  return `${env.publicUrl}/functions/v1/unsubscribe?t=${encodeURIComponent(await unsubscribeToken(email))}`;
}
