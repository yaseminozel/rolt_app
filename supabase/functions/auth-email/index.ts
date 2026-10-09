// GoTrue "send email" hook: renders the auth emails in the rider's language and sends them with
// Resend. Links point to the `auth-link` function, which finishes the action and hands over to
// the app (rolt://…). Verified with the Standard Webhooks signature (AUTH_EMAIL_HOOK_SECRET).

import { env, json, serviceFetch, toLocale, type Locale } from '../_shared/env.ts';
import { sendEmail } from '../_shared/resend.ts';
import {
  confirmSignupEmail,
  emailChangeEmail,
  passwordChangedEmail,
  reauthenticationEmail,
  recoveryEmail,
  type RenderedEmail,
} from '../_shared/templates.ts';

type HookPayload = {
  user: {
    id: string;
    email: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
};

const encoder = new TextEncoder();

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Standard Webhooks verification (webhook-id / webhook-timestamp / webhook-signature). */
async function verifySignature(req: Request, body: string) {
  const id = req.headers.get('webhook-id');
  const timestamp = req.headers.get('webhook-timestamp');
  const signatures = req.headers.get('webhook-signature');
  if (!id || !timestamp || !signatures || !env.authEmailHookSecret) {
    return false;
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 5 * 60) {
    return false;
  }
  const secret = env.authEmailHookSecret.replace(/^v1,/, '').replace(/^whsec_/, '');
  const key = await crypto.subtle.importKey('raw', base64ToBytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = bytesToBase64(await crypto.subtle.sign('HMAC', key, encoder.encode(`${id}.${timestamp}.${body}`)));
  return signatures.split(' ').some((entry) => entry.split(',')[1] === expected);
}

async function localeOf(user: HookPayload['user']): Promise<Locale> {
  const fromMetadata = user.user_metadata?.locale;
  if (fromMetadata === 'en' || fromMetadata === 'tr') {
    return fromMetadata;
  }
  try {
    const response = await serviceFetch(`/rest/v1/user_settings?user_id=eq.${user.id}&select=locale`);
    const rows = (await response.json()) as { locale: string }[];
    return toLocale(rows[0]?.locale);
  } catch {
    return 'tr';
  }
}

function linkFor(type: string, tokenHash: string, email: string, locale: Locale) {
  const params = new URLSearchParams({
    type,
    token: tokenHash,
    email,
    sent: String(Date.now()),
    lang: locale,
  });
  return `${env.publicUrl}/functions/v1/auth-link?${params}`;
}

function render(payload: HookPayload, locale: Locale): { to: string; email: RenderedEmail; tag: string }[] {
  const { user, email_data: data } = payload;
  switch (data.email_action_type) {
    case 'signup':
    case 'invite':
    case 'magiclink':
      return [{ to: user.email, email: confirmSignupEmail(locale, linkFor('signup', data.token_hash, user.email, locale)), tag: 'auth-signup' }];
    case 'recovery':
      return [{ to: user.email, email: recoveryEmail(locale, linkFor('recovery', data.token_hash, user.email, locale)), tag: 'auth-recovery' }];
    case 'email_change': {
      // Secure email change: one link to the current address, one to the new one.
      const newEmail = user.new_email ?? '';
      const mails = [];
      if (data.token_hash_new) {
        mails.push({ to: user.email, email: emailChangeEmail(locale, linkFor('email_change', data.token_hash_new, user.email, locale), newEmail), tag: 'auth-email-change' });
      }
      if (newEmail && data.token_hash) {
        mails.push({ to: newEmail, email: emailChangeEmail(locale, linkFor('email_change', data.token_hash, newEmail, locale), newEmail), tag: 'auth-email-change' });
      }
      return mails;
    }
    case 'reauthentication':
      return [{ to: user.email, email: reauthenticationEmail(locale, data.token), tag: 'auth-reauthentication' }];
    case 'password_changed_notification':
      return [{ to: user.email, email: passwordChangedEmail(locale), tag: 'auth-password-changed' }];
    default:
      // Other security notifications (email changed, identity linked…): nothing to send for now.
      return [];
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: { http_code: 405, message: 'method not allowed' } }, 405);
  }
  const body = await req.text();
  if (!(await verifySignature(req, body))) {
    return json({ error: { http_code: 401, message: 'invalid signature' } }, 401);
  }
  try {
    const payload = JSON.parse(body) as HookPayload;
    const locale = await localeOf(payload.user);
    for (const mail of render(payload, locale)) {
      await sendEmail({ to: mail.to, subject: mail.email.subject, html: mail.email.html, text: mail.email.text, tag: mail.tag });
    }
    return json({});
  } catch (error) {
    console.error('auth-email failed', error);
    return json({ error: { http_code: 500, message: 'email could not be sent' } }, 500);
  }
});
