// ROLT email templates (TR / EN). Plain, light layout in the app's language: neutral surface,
// black primary button, thin borders, the wordmark on top. Inline styles and tables only, so
// every mail client renders the same.

import { env, type Locale } from './env.ts';

const colors = {
  page: '#F3F4F4',
  surface: '#FFFFFF',
  border: '#E5E6E8',
  text: '#101318',
  secondary: '#6B6E73',
  tertiary: '#9EA0A4',
  brand: '#1515FF',
  button: '#101318',
};

const font = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const logoUrl = () => `${env.publicUrl}/storage/v1/object/public/public-assets/brand/rolt-wordmark.png`;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

type Block =
  | { type: 'text'; text: string }
  | { type: 'muted'; text: string }
  | { type: 'button'; label: string; url: string }
  | { type: 'code'; code: string }
  | { type: 'steps'; items: { title: string; text: string }[] };

type Layout = {
  locale: Locale;
  /** Hidden preview line in the inbox list. */
  preheader: string;
  title: string;
  blocks: Block[];
  /** Why the rider got this mail; one line in the footer. */
  reason: string;
  /** Marketing emails: "Abonelikten çık" link in the footer (same URL as the List-Unsubscribe header). */
  unsubscribe?: { url: string; label: string };
};

function renderBlock(block: Block) {
  switch (block.type) {
    case 'text':
      return `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${colors.text};">${escapeHtml(block.text)}</p>`;
    case 'muted':
      return `<p style="margin:0 0 16px;font-size:14px;line-height:20px;color:${colors.secondary};">${escapeHtml(block.text)}</p>`;
    case 'button':
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:12px;background:${colors.button};">
<a href="${escapeHtml(block.url)}" style="display:inline-block;padding:13px 24px;font-size:14px;line-height:18px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;font-family:${font};">${escapeHtml(block.label)}</a>
</td></tr></table>`;
    case 'code':
      return `<p style="margin:8px 0 24px;font-family:'JetBrains Mono',Menlo,Consolas,monospace;font-size:28px;letter-spacing:6px;font-weight:600;color:${colors.text};">${escapeHtml(block.code)}</p>`;
    case 'steps':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${block.items
        .map(
          (item, index) => `<tr><td valign="top" style="padding:0 12px 16px 0;width:28px;">
<div style="width:28px;height:28px;border-radius:14px;background:${colors.page};text-align:center;line-height:28px;font-size:13px;font-weight:600;color:${colors.text};">${index + 1}</div></td>
<td valign="top" style="padding:0 0 16px;"><p style="margin:0 0 2px;font-size:15px;line-height:20px;font-weight:600;color:${colors.text};">${escapeHtml(item.title)}</p>
<p style="margin:0;font-size:14px;line-height:20px;color:${colors.secondary};">${escapeHtml(item.text)}</p></td></tr>`,
        )
        .join('')}</table>`;
  }
}

function renderText(layout: Layout) {
  const lines = [layout.title, ''];
  for (const block of layout.blocks) {
    if (block.type === 'text' || block.type === 'muted') lines.push(block.text, '');
    if (block.type === 'button') lines.push(`${block.label}: ${block.url}`, '');
    if (block.type === 'code') lines.push(block.code, '');
    if (block.type === 'steps') {
      block.items.forEach((item, index) => lines.push(`${index + 1}. ${item.title} — ${item.text}`));
      lines.push('');
    }
  }
  lines.push('—', 'ROLT · roltapp.com', layout.reason);
  if (layout.unsubscribe) lines.push(`${layout.unsubscribe.label}: ${layout.unsubscribe.url}`);
  return lines.join('\n');
}

function render(layout: Layout) {
  const html = `<!doctype html>
<html lang="${layout.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${escapeHtml(layout.title)}</title></head>
<body style="margin:0;padding:0;background:${colors.page};font-family:${font};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(layout.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 4px 20px;"><img src="${logoUrl()}" width="88" alt="ROLT" style="display:block;border:0;height:auto;"></td></tr>
<tr><td style="background:${colors.surface};border:1px solid ${colors.border};border-radius:16px;padding:32px 28px 12px;">
<h1 style="margin:0 0 16px;font-size:24px;line-height:30px;font-weight:600;color:${colors.text};">${escapeHtml(layout.title)}</h1>
${layout.blocks.map(renderBlock).join('\n')}
</td></tr>
<tr><td style="padding:20px 4px 0;font-size:12px;line-height:18px;color:${colors.tertiary};">
${escapeHtml(layout.reason)}<br>ROLT · <a href="https://roltapp.com" style="color:${colors.tertiary};">roltapp.com</a>${
  layout.unsubscribe
    ? ` · <a href="${escapeHtml(layout.unsubscribe.url)}" style="color:${colors.tertiary};">${escapeHtml(layout.unsubscribe.label)}</a>`
    : ''
}
</td></tr>
</table></td></tr></table></body></html>`;
  return { html, text: renderText(layout) };
}

export type RenderedEmail = { subject: string; html: string; text: string };

const pick = <T>(locale: Locale, tr: T, en: T) => (locale === 'en' ? en : tr);

/** 02.07: confirm the address of a new email account (link valid 24 h). */
export function confirmSignupEmail(locale: Locale, url: string): RenderedEmail {
  const subject = pick(locale, 'E-posta adresini doğrula', 'Confirm your email address');
  return {
    subject,
    ...render({
      locale,
      preheader: pick(locale, 'ROLT hesabını açmak için son adım.', 'One last step to open your ROLT account.'),
      title: subject,
      blocks: [
        { type: 'text', text: pick(locale, 'ROLT hesabını açmak için son bir adım kaldı. Bu adresin sana ait olduğunu doğrula, rotalar seni bekliyor.', 'One step left to open your ROLT account. Confirm this address is yours and the routes are all yours.') },
        { type: 'button', label: pick(locale, 'E-postamı doğrula', 'Confirm my email'), url },
        { type: 'muted', text: pick(locale, 'Bağlantı 24 saat geçerli. Telefonunda açarsan doğrudan uygulamaya dönersin.', 'The link is valid for 24 hours. Open it on your phone to go straight back to the app.') },
      ],
      reason: pick(locale, 'Bu e-postayı ROLT hesabı açılırken bu adres kullanıldığı için aldın. Sen değilsen yok sayabilirsin.', 'You got this email because this address was used to create a ROLT account. If it wasn’t you, ignore it.'),
    }),
  };
}

/** 02.03 → 02.05: reset the password (link valid 30 min). */
export function recoveryEmail(locale: Locale, url: string): RenderedEmail {
  const subject = pick(locale, 'Şifreni sıfırla', 'Reset your password');
  return {
    subject,
    ...render({
      locale,
      preheader: pick(locale, 'Yeni şifreni belirlemek için bağlantı.', 'Your link to set a new password.'),
      title: subject,
      blocks: [
        { type: 'text', text: pick(locale, 'Şifreni sıfırlamak için aşağıdaki butona dokun ve yeni şifreni belirle.', 'Tap the button below and set a new password.') },
        { type: 'button', label: pick(locale, 'Yeni şifre belirle', 'Set a new password'), url },
        { type: 'muted', text: pick(locale, 'Bağlantı 30 dakika geçerli ve yalnızca bir kez kullanılabilir. Bağlantıyı ROLT yüklü telefonunda aç.', 'The link is valid for 30 minutes and works once. Open it on the phone with ROLT installed.') },
      ],
      reason: pick(locale, 'Şifre sıfırlamayı sen istemediysen bu e-postayı yok say; şifren değişmez.', 'If you didn’t ask to reset your password, ignore this email; your password stays the same.'),
    }),
  };
}

export function emailChangeEmail(locale: Locale, url: string, newEmail: string): RenderedEmail {
  const subject = pick(locale, 'Yeni e-posta adresini onayla', 'Confirm your new email address');
  return {
    subject,
    ...render({
      locale,
      preheader: pick(locale, 'E-posta değişikliğini onayla.', 'Confirm the email change.'),
      title: subject,
      blocks: [
        { type: 'text', text: pick(locale, `ROLT hesabının e-posta adresi ${newEmail} olarak değişecek. Onaylamak için butona dokun.`, `Your ROLT account email will change to ${newEmail}. Tap the button to confirm.`) },
        { type: 'button', label: pick(locale, 'Değişikliği onayla', 'Confirm the change'), url },
      ],
      reason: pick(locale, 'Bu değişikliği sen istemediysen bu e-postayı yok say ve şifreni değiştir.', 'If you didn’t ask for this change, ignore this email and change your password.'),
    }),
  };
}

export function reauthenticationEmail(locale: Locale, code: string): RenderedEmail {
  const subject = pick(locale, 'Doğrulama kodun', 'Your verification code');
  return {
    subject,
    ...render({
      locale,
      preheader: pick(locale, `Kodun: ${code}`, `Your code: ${code}`),
      title: subject,
      blocks: [
        { type: 'text', text: pick(locale, 'İşlemi onaylamak için bu kodu uygulamaya gir:', 'Enter this code in the app to confirm:') },
        { type: 'code', code },
      ],
      reason: pick(locale, 'Bu kodu sen istemediysen kimseyle paylaşma.', 'If you didn’t ask for this code, don’t share it with anyone.'),
    }),
  };
}

export function passwordChangedEmail(locale: Locale): RenderedEmail {
  const subject = pick(locale, 'Şifren değiştirildi', 'Your password was changed');
  return {
    subject,
    ...render({
      locale,
      preheader: pick(locale, 'ROLT hesabının şifresi az önce değişti.', 'Your ROLT password was just changed.'),
      title: subject,
      blocks: [
        { type: 'text', text: pick(locale, 'ROLT hesabının şifresi az önce değiştirildi. Bunu sen yaptıysan başka bir şey yapmana gerek yok.', 'The password of your ROLT account was just changed. If it was you, there’s nothing else to do.') },
        { type: 'muted', text: pick(locale, 'Sen değilsen uygulamada "Şifremi unuttum" ile hemen yeni bir şifre belirle.', 'If it wasn’t you, set a new password right away with "Forgot password" in the app.') },
      ],
      reason: pick(locale, 'Hesabının güvenliği için bu bildirimi gönderiyoruz.', 'We send this notice to keep your account safe.'),
    }),
  };
}

/** Sent once, when the rider finishes registration (04.07). */
export function welcomeEmail(locale: Locale, name: string): RenderedEmail {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const subject = first
    ? pick(locale, `ROLT’a hoş geldin, ${first}!`, `Welcome to ROLT, ${first}!`)
    : pick(locale, 'ROLT’a hoş geldin!', 'Welcome to ROLT!');
  return {
    subject,
    ...render({
      locale,
      preheader: pick(locale, 'Rota bul, sürüşünü kaydet, paylaş.', 'Find a route, record your ride, share it.'),
      title: subject,
      blocks: [
        { type: 'text', text: pick(locale, 'Hesabın hazır. ROLT’ta üç adımda yola çıkabilirsin:', 'Your account is ready. Hit the road with ROLT in three steps:') },
        {
          type: 'steps',
          items: [
            { title: pick(locale, 'Rota keşfet', 'Discover a route'), text: pick(locale, 'Yakınındaki virajlı, sahil ya da doğa rotalarını bul, beğendiklerini kaydet.', 'Find curvy, coastal or nature routes near you and save the ones you like.') },
            { title: pick(locale, 'Sürüşünü kaydet', 'Record your ride'), text: pick(locale, 'Rotayı adım adım sür ya da serbest sürüşünü kaydet. Kayıt önce telefonunda tutulur.', 'Ride a route turn by turn or record a free ride. It is saved on your phone first.') },
            { title: pick(locale, 'Paylaş', 'Share'), text: pick(locale, 'Sürüşünü toplulukla paylaş, diğer sürücüleri takip et.', 'Share your ride with the community and follow other riders.') },
          ],
        },
        { type: 'button', label: pick(locale, 'ROLT’u aç', 'Open ROLT'), url: `${env.appScheme}://` },
        { type: 'muted', text: pick(locale, 'Bir sorun ya da önerin olursa Ayarlar > Geri bildirim’den bize yaz.', 'Questions or ideas? Write to us from Settings > Feedback.') },
      ],
      reason: pick(locale, 'ROLT hesabını oluşturduğun için bu e-postayı aldın.', 'You got this email because you created a ROLT account.'),
    }),
  };
}

/** 10.16: confirmation after the account and its data were deleted. */
export function accountDeletedEmail(locale: Locale, name: string): RenderedEmail {
  const subject = pick(locale, 'Hesabın silindi', 'Your account was deleted');
  const first = name.trim().split(/\s+/)[0] ?? '';
  return {
    subject,
    ...render({
      locale,
      preheader: pick(locale, 'ROLT hesabın ve verilerin silindi.', 'Your ROLT account and data were deleted.'),
      title: subject,
      blocks: [
        { type: 'text', text: first
          ? pick(locale, `${first}, ROLT hesabın; profilin, sürüşlerin, gönderilerin ve fotoğraflarınla birlikte silindi.`, `${first}, your ROLT account was deleted together with your profile, rides, posts and photos.`)
          : pick(locale, 'ROLT hesabın; profilin, sürüşlerin, gönderilerin ve fotoğraflarınla birlikte silindi.', 'Your ROLT account was deleted together with your profile, rides, posts and photos.') },
        { type: 'muted', text: pick(locale, 'Yeniden aramıza katılmak istersen aynı e-posta adresiyle yeni bir hesap açabilirsin. Yolun açık olsun!', 'If you want to come back, you can open a new account with the same email. Ride safe!') },
      ],
      reason: pick(locale, 'Hesap silme isteğin üzerine bu e-postayı gönderdik.', 'We sent this email because you asked to delete your account.'),
    }),
  };
}

/** Small landing pages served by `auth-link` when an email link is opened in a browser. */
export function landingPage(
  locale: Locale,
  options: { title: string; text: string; appUrl?: string; buttonLabel?: string; formAction?: string },
) {
  // `formAction`: the button posts there instead of opening the app (unsubscribe confirmation, so
  // link scanners that open every URL in a mail don't unsubscribe anyone).
  const button = options.formAction
    ? `<form method="post" action="${escapeHtml(options.formAction)}" style="margin:0;"><button type="submit" style="margin-top:8px;padding:13px 24px;font-size:14px;font-weight:600;color:#fff;background:${colors.button};border:0;border-radius:12px;cursor:pointer;font-family:${font};">${escapeHtml(options.buttonLabel ?? 'OK')}</button></form>`
    : options.appUrl
    ? `<a href="${escapeHtml(options.appUrl)}" style="display:inline-block;margin-top:8px;padding:13px 24px;font-size:14px;font-weight:600;color:#fff;background:${colors.button};border-radius:12px;text-decoration:none;">${escapeHtml(options.buttonLabel ?? 'ROLT')}</a>`
    : '';
  const redirect = options.appUrl && !options.formAction
    ? `<script>setTimeout(function(){location.href=${JSON.stringify(options.appUrl)}},150)</script>`
    : '';
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(options.title)} · ROLT</title></head>
<body style="margin:0;background:${colors.page};font-family:${font};-webkit-font-smoothing:antialiased;">
<main style="max-width:420px;margin:0 auto;padding:48px 20px;">
<img src="${logoUrl()}" width="88" alt="ROLT" style="display:block;margin-bottom:24px;">
<div style="background:${colors.surface};border:1px solid ${colors.border};border-radius:16px;padding:28px 24px;">
<h1 style="margin:0 0 12px;font-size:22px;line-height:28px;font-weight:600;color:${colors.text};">${escapeHtml(options.title)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${colors.secondary};">${escapeHtml(options.text)}</p>
${button}
</div></main>${redirect}</body></html>`;
}
