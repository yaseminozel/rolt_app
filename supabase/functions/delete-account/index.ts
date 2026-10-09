// 10.16 Hesabı sil: deletes the signed-in rider's account for good. Removes their files from
// every bucket, keeps the optional reason (without the account), sends a confirmation email and
// deletes the auth user — the database cascades profiles, rides, posts, follows and the rest.

import { env, json, serviceFetch, toLocale } from '../_shared/env.ts';
import { sendEmail } from '../_shared/resend.ts';
import { accountDeletedEmail } from '../_shared/templates.ts';

const BUCKETS = ['avatars', 'ride-photos', 'post-photos', 'suggestion-photos', 'feedback'];
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StorageEntry = { name: string; id: string | null };

/** Every object path under `prefix` (folders have a null id and are walked). */
async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await serviceFetch(`/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      body: JSON.stringify({ prefix, limit: 1000, offset }),
    });
    if (!response.ok) {
      break;
    }
    const entries = (await response.json()) as StorageEntry[];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        paths.push(...(await listAll(bucket, path)));
      } else {
        paths.push(path);
      }
    }
    if (entries.length < 1000) {
      break;
    }
  }
  return paths;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405, cors);
  }
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const userResponse = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: env.anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) {
    return json({ error: 'not signed in' }, 401, cors);
  }
  const user = (await userResponse.json()) as { id: string; email?: string };
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

  const [profile] = (await (
    await serviceFetch(`/rest/v1/profiles?id=eq.${user.id}&select=name,handle`)
  ).json()) as { name: string; handle: string | null }[];
  const [settings] = (await (
    await serviceFetch(`/rest/v1/user_settings?user_id=eq.${user.id}&select=locale`)
  ).json()) as { locale: string }[];

  if (reason && reason.trim()) {
    await serviceFetch('/rest/v1/account_deletions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ reason: reason.trim().slice(0, 2000) }),
    });
  }

  for (const bucket of BUCKETS) {
    const paths = await listAll(bucket, user.id);
    for (let index = 0; index < paths.length; index += 500) {
      await serviceFetch(`/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        body: JSON.stringify({ prefixes: paths.slice(index, index + 500) }),
      });
    }
  }

  const deleted = await serviceFetch(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' });
  if (!deleted.ok) {
    console.error('delete user failed', deleted.status, await deleted.text());
    return json({ error: 'could not delete the account' }, 500, cors);
  }

  if (user.email) {
    try {
      const email = accountDeletedEmail(toLocale(settings?.locale), profile?.name || profile?.handle || '');
      await sendEmail({ to: user.email, subject: email.subject, html: email.html, text: email.text, tag: 'account-deleted' });
    } catch (error) {
      console.error('goodbye email failed', error);
    }
  }
  return json({ deleted: true }, 200, cors);
});
