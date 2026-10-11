#!/usr/bin/env node
// Maestro test account (development only, see docs/testing.md).
//   node scripts/e2e/test-account.mjs create <email> [password]   confirmed user with a finished profile
//   node scripts/e2e/test-account.mjs delete <email>
// The sign-in flows land on the tabs only when the profile is finished (otherwise `index` sends
// the account to registration 04.01 and the permission sheet). `create` makes the user with
// scripts/supabase/test-user.mjs and finishes registration through the app's own RPC.
// Use addresses at example.com (never real people).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const testUser = new URL('../supabase/test-user.mjs', import.meta.url).pathname;
const [command, email, password] = process.argv.slice(2);
if (!['create', 'delete'].includes(command) || !email) {
  console.error('usage: test-account.mjs create|delete <email> [password]');
  process.exit(1);
}
if (!email.toLowerCase().endsWith('@example.com')) {
  console.error('use an @example.com address');
  process.exit(1);
}

const run = (...args) => execFileSync(process.execPath, [testUser, ...args], { encoding: 'utf8' });

if (command === 'delete') {
  process.stdout.write(run('delete', email));
  process.exit(0);
}

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.server', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"(.*)"$/, '$1')]),
);
const url = env.SUPABASE_PUBLIC_URL || 'https://supabase.roltapp.com';

const user = JSON.parse(run('create', email, ...(password ? [password] : [])));
if (!user.accessToken) {
  console.error('could not sign in as the new user');
  process.exit(1);
}
const handle = `e2e_${user.id.replace(/-/g, '').slice(0, 8)}`;
const res = await fetch(`${url}/rest/v1/rpc/complete_registration`, {
  method: 'POST',
  headers: {
    apikey: env.ANON_KEY,
    Authorization: `Bearer ${user.accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ p: { name: 'ROLT E2E', handle } }),
});
if (!res.ok) {
  console.error(`complete_registration ${res.status}: ${await res.text()}`);
  process.exit(1);
}
// The password is the one Maestro needs (MAESTRO_PASSWORD); the token is not printed.
console.log(JSON.stringify({ id: user.id, email, password: user.password, handle }, null, 2));
