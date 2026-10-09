// Opens auth email links (https, so every mail app follows them) and hands over to the app.
//
// - signup / email_change: the address is confirmed right here, so it also works when the mail
//   is opened on a computer; the page then opens rolt://email-verification/confirm?token=verified
//   (or `expired` / `invalid`), where the app re-reads the account.
// - recovery: the one-time token is passed on to rolt://reset-password?token=… where the rider
//   sets the new password (02.05). Links older than 30 minutes go to rolt://reset-link-expired.

import { env, toLocale, type Locale } from '../_shared/env.ts';
import { landingPage } from '../_shared/templates.ts';

const RESET_LINK_VALIDITY_MS = 30 * 60 * 1000;

const copy = {
  verified: {
    tr: { title: 'E-posta adresin doğrulandı', text: 'Her şey hazır. ROLT’a dönüp kaldığın yerden devam edebilirsin.', button: 'ROLT’u aç' },
    en: { title: 'Your email is confirmed', text: 'All set. Go back to ROLT and pick up where you left off.', button: 'Open ROLT' },
  },
  expired: {
    tr: { title: 'Bağlantının süresi dolmuş', text: 'Bu bağlantı artık geçerli değil. Uygulamadan yeni bir bağlantı isteyebilirsin.', button: 'ROLT’u aç' },
    en: { title: 'This link has expired', text: 'This link is no longer valid. You can ask for a new one in the app.', button: 'Open ROLT' },
  },
  invalid: {
    tr: { title: 'Bağlantı geçersiz', text: 'Bu bağlantı daha önce kullanılmış ya da hatalı. Uygulamadan yeni bir bağlantı isteyebilirsin.', button: 'ROLT’u aç' },
    en: { title: 'This link is not valid', text: 'This link was already used or is broken. You can ask for a new one in the app.', button: 'Open ROLT' },
  },
  recovery: {
    tr: { title: 'Yeni şifreni belirle', text: 'Devam etmek için bu bağlantıyı ROLT yüklü telefonunda aç.', button: 'ROLT’ta devam et' },
    en: { title: 'Set your new password', text: 'Open this link on the phone with ROLT installed to continue.', button: 'Continue in ROLT' },
  },
} as const;

function page(locale: Locale, kind: keyof typeof copy, appUrl: string) {
  const text = copy[kind][locale];
  return new Response(landingPage(locale, { title: text.title, text: text.text, appUrl, buttonLabel: text.button }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const appLink = (path: string, params: Record<string, string>) =>
  `${env.appScheme}://${path}?${new URLSearchParams(params)}`;

async function verify(type: 'email' | 'email_change', tokenHash: string) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, token_hash: tokenHash }),
  });
  if (response.ok) {
    return 'verified' as const;
  }
  const body = (await response.json().catch(() => ({}))) as { error_code?: string; code?: string };
  return (body.error_code ?? body.code) === 'otp_expired' ? ('expired' as const) : ('invalid' as const);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? '';
  const token = url.searchParams.get('token') ?? '';
  const email = url.searchParams.get('email') ?? '';
  const sent = Number(url.searchParams.get('sent') ?? 0);
  const locale = toLocale(url.searchParams.get('lang'));

  if (type === 'recovery') {
    if (!token) {
      return page(locale, 'invalid', appLink('reset-link-expired', {}));
    }
    if (sent > 0 && Date.now() - sent > RESET_LINK_VALIDITY_MS) {
      return page(locale, 'expired', appLink('reset-link-expired', { email }));
    }
    return page(locale, 'recovery', appLink('reset-password', { token, email }));
  }

  if (type === 'signup' || type === 'email_change') {
    const status = token ? await verify(type === 'signup' ? 'email' : 'email_change', token) : 'invalid';
    return page(locale, status, appLink('email-verification/confirm', { token: status, email }));
  }

  return page(locale, 'invalid', `${env.appScheme}://`);
});
