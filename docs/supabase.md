# Supabase backend (self-hosted)

ROLT's backend is the self-hosted Supabase at **https://supabase.roltapp.com**, running as the
Dokploy compose stack `rolt-supabase-a0xf6c` (project **Rolt**) on the Dokploy host. Everything the
backend needs is in this repo:

| Path | What |
|---|---|
| `supabase/migrations/*.sql` | Schema, RLS, triggers, read-model RPCs, storage buckets, Realtime publication, cron jobs |
| `supabase/functions/*` | Edge functions (Deno): `auth-email`, `auth-link`, `push`, `email`, `delete-account` |
| `scripts/supabase/migrate.sh` | Applies pending migrations (as `postgres`, inside the db container, over ssh) |
| `scripts/supabase/configure-server.sh` | Pushes auth / email / push config to the stack and deploys the functions |
| `scripts/supabase/gen-types.sh` | Regenerates `src/lib/supabase/database.types.ts` from the live schema |
| `scripts/supabase/test-user.mjs` | Creates / deletes confirmed test accounts (example.com only) |
| `scripts/supabase/seed-catalog.mjs` | Seeds the official ROLT account, the route catalog, its photos and places |

## Environment files

- `.env` (git-ignored): only what the app needs — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  Mapbox, routing. Template: `.env.example`. Without the Supabase values every feature runs on its mock.
- `.env.server` (git-ignored): the stack's env (database, JWT keys, Studio) plus the keys this repo
  owns (auth URLs, SMTP / Resend, hook secrets, Google / Apple, Expo push token). Editing it does
  nothing until `scripts/supabase/configure-server.sh` runs. Never ship it, never `eas env:push` it.
- EAS builds don't read `.env`: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` must be
  set as EAS environment variables in `development`, `preview` and `production`:
  `npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value … --environment production --visibility plaintext`.

## Auth

- Email + password with confirmation. The `lookup_email` RPC tells 02.01 whether an address is new,
  a password account or a Google / Apple account.
  It is rate limited per client IP (30 lookups / 10 min, `private.rate_limit_hit`, from the
  proxies' `x-forwarded-for`); over the limit it answers `P0429` and 02.01 shows "Çok fazla deneme".
- Lockout (02.02): the GoTrue *password verification* hook (`public.hook_password_verification_attempt`)
  locks password sign-in for 15 minutes after 3 wrong passwords; the app reads `account_locked:<time>`.
- Emails: GoTrue's *send email* hook calls `auth-email`, which renders TR / EN templates
  (`supabase/functions/_shared/templates.ts`) and sends them with Resend from `noreply@roltapp.com`.
  Links go to `auth-link` (https): sign-up / email change are confirmed on the server (works from a
  computer too) and the page opens `rolt://email-verification/confirm?token=verified|expired|invalid`;
  password reset opens `rolt://reset-password?token=…` (30-minute window, otherwise
  `rolt://reset-link-expired`). Verification links are valid 24 h (`MAILER_OTP_EXP`).
- An unverified email account has no session. While 02.07 waits, the app keeps the address and
  password in the keychain and signs in as soon as the link was opened (or the app comes back).
- Apple: native sheet on iOS (`expo-apple-authentication`, ID token; client id = bundle id
  `com.roltapp.rolt`, already enabled). Android / web use the browser flow and need the Services ID
  and client secret JWT in `.env.server` (`APPLE_CLIENT_ID=com.roltapp.rolt,<services id>`, `APPLE_SECRET`).
- Google: browser OAuth with PKCE (`expo-web-browser`), redirect `rolt://auth/callback`. Needs a
  Google Cloud OAuth client of type *Web application* with the redirect URI
  `https://supabase.roltapp.com/auth/v1/callback`; put `GOOGLE_CLIENT_ID`, `GOOGLE_SECRET` and
  `GOOGLE_ENABLED=true` in `.env.server` and run `configure-server.sh`.
- Account deletion (10.16): the `delete-account` function removes the rider's files, stores the
  optional reason without the account, deletes the auth user (the database cascades) and sends a
  confirmation email.

## Data and privacy

- Every table has RLS. Writes need a verified account (`public.is_verified()`); blocks hide
  profiles, content and interactions both ways (`public.is_blocked_between`).
- Rides are local-first (P0): the app uploads a saved ride with `upsert_ride`. Others only see
  `rides.preview_path` — the track with the owner's start / finish cut (10.05) and simplified; the
  full track (`ride_tracks`) is readable by the owner only.
- Visibility: rides `public` / `followers` / `private`, posts `public` / `followers`
  (`can_view_ride`, `can_view_post`). Follows have a `status` (`pending` is ready for private
  accounts: follow requests).
- Counters (likes, comments, saves, followers, rides) are kept by triggers; never computed in queries.
- Route lists (`routes_recommended`, `_search`, `_suggest`, `_in_area`, `_near`, `_by_ids`,
  `_by_author`) return a simplified line (`private.route_list_json`, ~20 m, exact start / end,
  `geometryDetail: 'simplified'`); only `route_by_id` returns the full line (`'full'`). Navigation
  and offline maps use the full one (migration `0090_route_list_geometry.sql`).
- Storage buckets: `avatars`, `ride-photos`, `post-photos`, `route-photos`, `public-assets` (public,
  random paths under `<user id>/`), `suggestion-photos`, `feedback` (private). Images in lists use the
  image transformer (`/storage/v1/render/image/…?width=…`).

## Notifications and push

1. A like, comment, follow (or follow request), approved route suggestion, message, weekly
   "new routes near you" digest (pg_cron, Saturdays 10:00) or product announcement inserts or
   merges a row in `notifications` with ready text in the rider's language (`private.notify`).
   Unread likes on the same post / ride merge ("Ayşe ve 4 kişi daha …") and push again at most hourly.
2. A trigger calls the `push` function through `pg_net` (`private.config`: `push_url`,
   `internal_secret`). It checks the rider's settings (`user_settings.notify_*`), sends to all of
   their Expo push tokens with the unread badge, and drops tokens Expo reports as unregistered.
3. The app also listens to `notifications` over Realtime (badge and list update live).

Reviewer actions (Studio SQL editor or service role):
`select public.approve_route_suggestion('<id>');`, `select public.reject_route_suggestion('<id>', 'note');`,
`select public.broadcast_product_update('TR başlık', 'TR metin', 'EN title', 'EN text');`.
Reports and feedback land in `public.reports` and `public.feedback`.

## Realtime

Published tables: `notifications`, `post_comments`, `ride_comments`, `messages`,
`conversation_members`. The feed itself refreshes on pull and focus.

Realtime picks its tenant from the first label of the host Kong forwards to (`realtime:4000`), so
the tenant in `_realtime.tenants` is named `realtime` (the stock seed's `realtime-dev` was renamed on
2026-10-09; `SEED_SELF_HOST` re-creates an unused `realtime-dev` row on restart, which is harmless).
If websockets answer 403 `TenantNotFound`, check that row first.

## Messaging (backend only)

`conversations`, `conversation_members`, `messages` with RLS, `start_direct_conversation`,
`list_conversations`, push on new messages and Realtime. There is no design yet; the data layer
lives in `src/features/messages/` for the future screens.

## Emails

Templates: `supabase/functions/_shared/templates.ts` — sign-up confirmation, password reset, email
change, re-authentication code, password changed, welcome (once, when registration finishes) and
account deleted. Logo: `public-assets/brand/rolt-wordmark.png`.

Marketing consent (migration `0110_marketing_consent.sql`): `user_settings.email_marketing` (off by
default; the switch in 10.09). Every change is logged in `private.consent_log` (address, granted,
source `app` / `unsubscribe_link` / `admin`, wording version) — the record of consent; it survives
account deletion. Recipients: `select * from public.email_marketing_audience();` (confirmed,
opted-in accounts with their locale; service role only). Every marketing email must be sent with
`sendEmail({ …, unsubscribeUrl: await unsubscribeUrl(to) })` (adds `List-Unsubscribe` +
`List-Unsubscribe-Post`) and the template's `unsubscribe` footer link. The `unsubscribe` function
(`/functions/v1/unsubscribe?t=…`, HMAC token keyed with `INTERNAL_HOOK_SECRET`) shows a confirmation
page on GET and unsubscribes on POST (mail apps' one-click), for the account and `waitlist.unsubscribed_at`.

## Website pages

The `site` function renders roltapp.com's dynamic pages; the website's nginx proxies `/rota/<id>`,
`/rotalar`, `/rotalar/<city>`, `/u/<handle>`, `/r/<ride id>`, `/harita/(rota|r)/<id>.png` and
`/sitemap.xml` to `/functions/v1/site/…`. It reads with the anon key only (route_by_id,
routes_search, get_ride, rider_id_by_handle, get_rider), so pages never show more than the app shows
a guest. Static maps use Mapbox Static Images with `MAPBOX_ACCESS_TOKEN` (public `pk.` token in
`.env.server`, passed to the functions container by `configure-server.sh`). Pages are cached 5 min,
maps 1 day. Check: `curl -s https://roltapp.com/rota/kas-kalkan | grep og:`.

## Backups

Nightly at 03:25 (host time) `/root/backups/rolt/backup.sh` (source: `scripts/supabase/server/backup.sh`,
installed with `scripts/supabase/install-backup.sh`): verified `pg_dump` of the database, roles, the
pgsodium key, the storage volume and the stack config; 14 days kept; `last-status.txt` shows the
last run and a failure is mailed (Resend) to the host's backup alert address. Copies stay on the
same server — an offsite copy (R2 / S3) is still to do.

Restore (fresh stack): restore `globals-*.sql` with psql, then `pg_restore -d postgres db-*.dump`
as `supabase_admin`, put `etc/postgresql-custom` from `pgconfig-*.tgz` back before starting the
db, and unpack `storage-*.tgz` into `files/volumes/`.

## Telemetry (events and JS errors)

No third-party account: the app writes product / GPS events to `public.app_events` and JS errors
to `public.app_errors` (migration `0080_app_telemetry.sql`). Clients (guests too) may only
**insert**; select / update / delete are revoked, so read them in Studio's SQL editor or `psql`.
Rows carry a random `install_id` (per installation, kept on the device) and `session_id` (per
launch), `platform`, `os_version`, `app_version`, `build_version` (iOS build number),
`runtime_version` / `update_id` (expo-updates; the fingerprint pins the native build),
`device_model` (Android brand + model; null on iOS until `expo-device` is added) and `is_dev`
(development builds — filter them out). `user_id` is the signed-in account (null for guests).
No emails, no coordinates; event props are flat primitives, at most 4 KB (`check`). Both tables
are kept 90 days (pg_cron `rolt-cleanup-app-telemetry`, 03:50 UTC). Rows over a per-IP budget
(3000 events / 300 errors per 10 minutes) are dropped silently.

Client: `src/features/analytics/` — `trackEvent` queues in memory plus a small backlog on the
device and sends batches with one insert (every 30 s, at 20 events, when the app goes to the
background, when the connection returns); a batch Postgres refuses is dropped, network failures
are retried 5 times. Errors: global handler (`ErrorUtils`), unhandled promise rejections (release
builds; Hermes tracker), and the root error boundary (`AppErrorBoundary`, "Bir şeyler ters gitti"
screen); one row per distinct error per launch (`occurrences` counts repeats), fatal errors are
written to the device synchronously and sent at once or on the next launch.

Events: `onboarding_*`; `gps_degraded` { state weak|lost, context record|navigation, moving,
accuracyM, silenceS, simulated }, `gps_recovered` { state (worst), durationS, context },
`ride_gps_summary` { context, durationS, weakCount, lostCount, weakSeconds, lostSeconds,
fixIntervalAvgMs, fixCount } (rides under 30 s send none; manual pauses aren't measured).

```sql
-- Event counts per day
select date_trunc('day', created_at) as day, name, count(*)
from public.app_events where not is_dev group by 1, 2 order by 1 desc, 3 desc;

-- GPS drops per device / OS (real rides only)
select platform, device_model, os_version, props ->> 'state' as state, props ->> 'context' as context,
       count(*) as drops, round(avg((props ->> 'accuracyM')::numeric)) as avg_accuracy_m,
       count(*) filter (where (props ->> 'moving')::boolean) as while_moving
from public.app_events
where name = 'gps_degraded' and not is_dev and props ->> 'simulated' = 'false'
group by 1, 2, 3, 4, 5 order by drops desc;

-- Share of ride time with weak / lost GPS, fix rate
select platform, device_model, props ->> 'context' as context, count(*) as rides,
       round(100.0 * sum((props ->> 'weakSeconds')::int) / nullif(sum((props ->> 'durationS')::int), 0), 2) as weak_pct,
       round(100.0 * sum((props ->> 'lostSeconds')::int) / nullif(sum((props ->> 'durationS')::int), 0), 2) as lost_pct,
       round(avg((props ->> 'fixIntervalAvgMs')::numeric)) as avg_fix_interval_ms
from public.app_events
where name = 'ride_gps_summary' and not is_dev and props ->> 'simulated' = 'false'
group by 1, 2, 3 order by rides desc;

-- How long GPS outages last
select props ->> 'state' as state, count(*),
       percentile_cont(0.5) within group (order by (props ->> 'durationS')::int) as median_s,
       max((props ->> 'durationS')::int) as max_s
from public.app_events where name = 'gps_recovered' and not is_dev group by 1;

-- Errors grouped (latest first), with how many installs hit them
select message, kind, bool_or(is_fatal) as fatal, sum(occurrences) as times,
       count(distinct install_id) as installs, max(created_at) as last_seen,
       array_agg(distinct app_version) as versions, array_agg(distinct screen) as screens
from public.app_errors where not is_dev
group by 1, 2 order by last_seen desc;

-- One error in full
select created_at, platform, os_version, app_version, update_id, screen, stack, component_stack
from public.app_errors where message like '%…%' order by created_at desc limit 5;
```

Limits: stacks of release builds are minified (Hermes bytecode offsets); symbolicate with the
source maps of that build / update (EAS Update keeps them) until a crash reporter is added. Native
crashes (Swift / Kotlin, out-of-memory kills) never reach JS and need Sentry or Crashlytics later.
Anyone with the anon key can insert rows: the per-IP budget limits floods, but the data is
untrusted input.

## Monitoring

Every 5 minutes `/root/backups/rolt/healthcheck.sh` (source `scripts/supabase/server/healthcheck.sh`,
installed with `scripts/supabase/install-monitoring.sh`) checks auth, REST, storage, edge functions,
the website and share links, the stack's containers, `pg_isready`, TLS certificates (≥ 14 days
left), the last backup (OK, < 26 h old), disk (< 90 %), failed pg_cron runs and failed push / email
calls (`net._http_response`). It mails the backup alert address when a check starts failing (or
the set of problems changes) and once when everything passes again; history in `health.log`.

## Changing the backend

1. Add `supabase/migrations/NNNN_name.sql` (RLS on new tables), run `scripts/supabase/migrate.sh`.
2. `scripts/supabase/gen-types.sh`.
3. Functions or auth config changed: `scripts/supabase/configure-server.sh` (backs up the stack's
   compose and env under `/root/rolt-backup/` on the host first, and writes them into Dokploy so a
   redeploy keeps them).
