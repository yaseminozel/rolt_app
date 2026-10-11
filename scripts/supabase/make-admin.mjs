#!/usr/bin/env node
// Grants or revokes the admin role (moderation panel at https://roltapp.com/admin).
//   node scripts/supabase/make-admin.mjs <email>            makes the account an admin
//   node scripts/supabase/make-admin.mjs <email> --revoke   takes the role away
//   node scripts/supabase/make-admin.mjs --list             lists admins
// The role lives in the account's app metadata (`role: 'admin'`), which only the service role can
// write; `public.is_admin()` reads it from the database, so changes apply at once. Reads keys
// from .env.server.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.server', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"(.*)"$/, '$1')]),
);
const url = env.SUPABASE_PUBLIC_URL || 'https://supabase.roltapp.com';
const service = env.SERVICE_ROLE_KEY;
const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };

async function listUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${url}/auth/v1/admin/users?per_page=1000&page=${page}`, { headers: admin });
    if (!res.ok) {
      throw new Error(`listing users failed: ${res.status} ${await res.text()}`);
    }
    const batch = (await res.json()).users ?? [];
    users.push(...batch);
    if (batch.length < 1000) {
      return users;
    }
  }
}

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const email = args.find((arg) => !arg.startsWith('--'));

if (args.includes('--list')) {
  const admins = (await listUsers()).filter((u) => u.app_metadata?.role === 'admin');
  console.log(admins.length ? admins.map((u) => u.email).join('\n') : 'no admins');
  process.exit(0);
}
if (!email) {
  console.error('usage: make-admin.mjs <email> [--revoke] | --list');
  process.exit(1);
}

const user = (await listUsers()).find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`no account with ${email}`);
  process.exit(1);
}
if (!revoke && !user.email_confirmed_at) {
  console.error(`${email} hasn't confirmed its email yet`);
  process.exit(1);
}

// GoTrue merges app metadata; a null value removes the key (provider keys stay).
const res = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
  method: 'PUT',
  headers: admin,
  body: JSON.stringify({ app_metadata: { role: revoke ? null : 'admin' } }),
});
if (!res.ok) {
  console.error(`update failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const updated = await res.json();
const isAdmin = updated.app_metadata?.role === 'admin';
console.log(`${email}: ${isAdmin ? 'admin' : 'not an admin'}`);
process.exit(isAdmin === !revoke ? 0 : 1);
