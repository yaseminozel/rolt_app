// Transactional emails that aren't part of GoTrue: currently the welcome email, sent once when a
// rider finishes registration (database trigger private.on_profile_completed → pg_net).

import { isInternalCall, json, serviceFetch, toLocale } from '../_shared/env.ts';
import { sendEmail } from '../_shared/resend.ts';
import { welcomeEmail } from '../_shared/templates.ts';

type Request_ = { type: 'welcome'; userId: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST' || !isInternalCall(req)) {
    return json({ error: 'forbidden' }, 403);
  }
  const body = (await req.json()) as Request_;
  if (body.type !== 'welcome' || !body.userId) {
    return json({ error: 'unknown email' }, 400);
  }

  const userResponse = await serviceFetch(`/auth/v1/admin/users/${body.userId}`);
  if (!userResponse.ok) {
    return json({ error: 'user not found' }, 404);
  }
  const user = (await userResponse.json()) as { email?: string };
  if (!user.email) {
    return json({ sent: false });
  }
  const [profile] = (await (
    await serviceFetch(`/rest/v1/profiles?id=eq.${body.userId}&select=name,handle`)
  ).json()) as { name: string; handle: string | null }[];
  const [settings] = (await (
    await serviceFetch(`/rest/v1/user_settings?user_id=eq.${body.userId}&select=locale`)
  ).json()) as { locale: string }[];

  const email = welcomeEmail(toLocale(settings?.locale), profile?.name || profile?.handle || '');
  await sendEmail({ to: user.email, subject: email.subject, html: email.html, text: email.text, tag: 'welcome' });
  return json({ sent: true });
});
