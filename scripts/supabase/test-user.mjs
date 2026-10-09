#!/usr/bin/env node
// Test accounts against the self-hosted Supabase (development only).
//   node scripts/supabase/test-user.mjs create <email> [password]   confirmed user + profile, prints JSON with access token
//   node scripts/supabase/test-user.mjs token <email> <password>     prints an access token
//   node scripts/supabase/test-user.mjs delete <email>               deletes the user (and everything it owns)
// Use addresses at example.com (never real people). Reads keys from .env.server.
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
const anon = env.ANON_KEY;
const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };

async function findUser(email) {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: admin });
  const body = await res.json();
  return (body.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function token(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

const [command, email, password = 'Rolt-Test-1234'] = process.argv.slice(2);
if (!command || !email) {
  console.error('usage: test-user.mjs create|token|delete <email> [password]');
  process.exit(1);
}
if (command === 'create') {
  let user = await findUser(email);
  if (!user) {
    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: admin,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { locale: 'tr' } }),
    });
    user = await res.json();
    if (!user.id) {
      console.error(user);
      process.exit(1);
    }
  }
  const session = await token(email, password);
  console.log(JSON.stringify({ id: user.id, email, password, accessToken: session.access_token }, null, 2));
} else if (command === 'token') {
  const session = await token(email, password);
  console.log(session.access_token ?? JSON.stringify(session));
} else if (command === 'delete') {
  const user = await findUser(email);
  if (user) {
    const res = await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: admin });
    console.log(res.status === 200 ? `deleted ${email}` : await res.text());
  } else {
    console.log('no such user');
  }
}
