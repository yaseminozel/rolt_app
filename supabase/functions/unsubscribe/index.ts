// Unsubscribe from marketing emails (footer link and the List-Unsubscribe header).
//
// - GET ?t=<token>: a confirmation page; its button posts back here. Opening the link alone changes
//   nothing, because mail security scanners open every link in a message.
// - POST ?t=<token>: turns marketing emails off for the address (account and waitlist). Mail apps
//   send `List-Unsubscribe=One-Click` here directly (RFC 8058); the page's form lands here too.
// Withdrawals are logged in private.consent_log (source `unsubscribe_link`).

import { rpc, toLocale, type Locale } from '../_shared/env.ts';
import { landingPage } from '../_shared/templates.ts';
import { verifyUnsubscribeToken } from '../_shared/unsubscribe.ts';

const copy = {
  confirm: {
    tr: { title: 'E-posta aboneliğinden çık', text: '{email} adresine ROLT haberleri ve kampanya e-postaları gönderilmesin mi? Hesap e-postaları (şifre sıfırlama gibi) gelmeye devam eder.', button: 'Abonelikten çık' },
    en: { title: 'Unsubscribe from emails', text: 'Stop sending ROLT news and offers to {email}? Account emails (like password resets) still arrive.', button: 'Unsubscribe' },
  },
  done: {
    tr: { title: 'Abonelikten çıktın', text: 'Bu adrese artık haber ve kampanya e-postası göndermeyeceğiz. Fikrini değiştirirsen ROLT’ta Ayarlar › Bildirimler’den yeniden açabilirsin.' },
    en: { title: 'You’re unsubscribed', text: 'We won’t send news or offers to this address anymore. Changed your mind? Turn them back on in ROLT under Settings › Notifications.' },
  },
  invalid: {
    tr: { title: 'Bağlantı geçersiz', text: 'Bu bağlantı hatalı ya da eksik kopyalanmış. E-postadaki bağlantıyı yeniden açmayı dene.' },
    en: { title: 'This link is not valid', text: 'This link is broken or was copied incompletely. Try opening the link in the email again.' },
  },
  failed: {
    tr: { title: 'Bir sorun oluştu', text: 'Şu anda işlemi tamamlayamadık. Birazdan tekrar dene.' },
    en: { title: 'Something went wrong', text: 'We couldn’t finish this right now. Please try again shortly.' },
  },
} as const;

const localeOf = (req: Request): Locale =>
  toLocale(/^tr\b/i.test(req.headers.get('accept-language') ?? 'tr') ? 'tr' : 'en');

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const locale = localeOf(req);
  const email = await verifyUnsubscribeToken(url.searchParams.get('t') ?? '');
  if (!email) {
    return html(landingPage(locale, copy.invalid[locale]), 400);
  }

  if (req.method === 'GET') {
    const text = copy.confirm[locale];
    return html(
      landingPage(locale, {
        title: text.title,
        text: text.text.replace('{email}', email),
        buttonLabel: text.button,
        // Relative, so it posts back through whichever host served the page.
        formAction: `?t=${encodeURIComponent(url.searchParams.get('t') ?? '')}`,
      }),
    );
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    await rpc('email_marketing_unsubscribe', { p_email: email });
  } catch (error) {
    console.error('unsubscribe failed', error);
    return html(landingPage(locale, copy.failed[locale]), 500);
  }
  return html(landingPage(locale, copy.done[locale]));
});
