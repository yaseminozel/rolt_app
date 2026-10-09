#!/usr/bin/env node
// Seeds the route catalog of the self-hosted Supabase from the app's fixtures. Idempotent: rerun
// after changing `src/features/routes/fixtures/*` (routes and places are upserted by id).
//   node scripts/supabase/seed-catalog.mjs
// 1. The official ROLT account (rolt@roltapp.com, confirmed, random password nobody knows; no
//    email is sent) with its profile (handle `rolt`, `is_official`) and avatar.
// 2. Route photos → `route-photos/catalog/<file>`; brand logos → `public-assets/brand/` (emails).
// 3. Fixture routes (ids kept, author ROLT, real Mapbox lines from `routeGeometries.ts`) and
//    places → `public.routes` / `public.places`, in one SQL transaction run as `postgres` inside
//    the db container (like migrate.sh), since geometry can't go through PostgREST reliably.
// Reads keys from .env.server; prints no secrets.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HOST = process.env.ROLT_HOST ?? '13.140.142.248';
const DB = process.env.ROLT_DB_CONTAINER ?? 'rolt-supabase-a0xf6c-db-1';

const OFFICIAL_EMAIL = 'rolt@roltapp.com';
const OFFICIAL_PROFILE = {
  handle: 'rolt',
  name: 'ROLT',
  bio: 'ROLT ekibinin seçtiği rotalar. Yeni rotalar, ipuçları ve topluluktan haberler burada.',
};
const BRAND_DIR = join(ROOT, 'assets/brand');
const AVATAR_FILE = join(BRAND_DIR, 'rolt-icon-wordmark.png');
/** Brand pictures emails can link to (`public-assets` bucket, public URLs). */
const BRAND_ASSETS = [
  ['rolt-icon-wordmark.png', 'brand/rolt-wordmark.png'],
  ['rolt-icon-wordmark-bleed.png', 'brand/rolt-wordmark-bleed.png'],
  ['rolt-icon-r-mark.png', 'brand/rolt-r-mark.png'],
  // White wordmark on a transparent background (the splash), for headers on the brand blue.
  ['../splash-icon.png', 'brand/rolt-wordmark-white.png'],
];
const ROUTE_PHOTO_PREFIX = 'catalog';

/** Places the community search knows besides the route fixtures' places (13.04). */
const EXTRA_PLACES = [
  { id: 'olimpos', name: 'Olimpos', district: 'Kumluca', province: 'Antalya', centreFrom: 'olympos' },
  // Name = province, so the community search shows just "Bolu" (province centre).
  { id: 'bolu', name: 'Bolu', district: '', province: 'Bolu', centre: [31.6116, 40.7399] },
];

// ---------------------------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------------------------

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.server'), 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"(.*)"$/, '$1')]),
);
const url = (env.SUPABASE_PUBLIC_URL || 'https://supabase.roltapp.com').replace(/\/+$/, '');
const service = env.SERVICE_ROLE_KEY;
if (!service) {
  throw new Error('SERVICE_ROLE_KEY missing in .env.server');
}
const admin = { apikey: service, Authorization: `Bearer ${service}` };

// ---------------------------------------------------------------------------------------------
// Fixtures: the TypeScript modules are transpiled on the fly (typescript from node_modules);
// image `require()`s resolve to their absolute file path.
// ---------------------------------------------------------------------------------------------

function loadFixtures() {
  const require = createRequire(import.meta.url);
  const ts = require(join(ROOT, 'node_modules/typescript'));
  const extensions = Module._extensions;
  const saved = { ts: extensions['.ts'], jpg: extensions['.jpg'], png: extensions['.png'] };
  extensions['.ts'] = (module, filename) => {
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
  const asset = (module, filename) => {
    module.exports = filename;
  };
  extensions['.jpg'] = asset;
  extensions['.png'] = asset;
  try {
    const routes = require(join(ROOT, 'src/features/routes/fixtures/routes.ts'));
    const places = require(join(ROOT, 'src/features/routes/fixtures/places.ts'));
    return { ...routes, ...places };
  } finally {
    Object.assign(extensions, { '.ts': saved.ts, '.jpg': saved.jpg, '.png': saved.png });
  }
}

// ---------------------------------------------------------------------------------------------
// Auth and Storage (service role)
// ---------------------------------------------------------------------------------------------

async function json(response) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.url}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function findUser(email) {
  for (let page = 1; ; page += 1) {
    const body = await json(
      await fetch(`${url}/auth/v1/admin/users?per_page=1000&page=${page}`, { headers: admin }),
    );
    const users = body.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email);
    if (match || users.length < 1000) {
      return match ?? null;
    }
  }
}

/** Admin-created with `email_confirm`: no confirmation email goes out. */
async function ensureOfficialUser() {
  const existing = await findUser(OFFICIAL_EMAIL);
  if (existing) {
    return existing.id;
  }
  const user = await json(
    await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { ...admin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OFFICIAL_EMAIL,
        password: randomBytes(32).toString('base64url'),
        email_confirm: true,
        user_metadata: { locale: 'tr', name: OFFICIAL_PROFILE.name },
      }),
    }),
  );
  console.log(`created ${OFFICIAL_EMAIL}`);
  return user.id;
}

const CONTENT_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

async function upload(bucket, path, file) {
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      ...admin,
      'Content-Type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'max-age=86400',
      'x-upsert': 'true',
    },
    body: readFileSync(file),
  });
  await json(response);
  console.log(`uploaded ${bucket}/${path}`);
  return path;
}

// ---------------------------------------------------------------------------------------------
// SQL (one transaction inside the db container, as `postgres`)
// ---------------------------------------------------------------------------------------------

function runSql(sql) {
  const result = spawnSync(
    'ssh',
    ['-o', 'BatchMode=yes', HOST, `docker exec -i ${DB} psql -U postgres -d postgres -X -q -At -v ON_ERROR_STOP=1`],
    { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

/** Dollar-quoted JSON literal; the tag can't occur in the data. */
function jsonLiteral(value) {
  const text = JSON.stringify(value);
  if (text.includes('$seed$')) {
    throw new Error('seed data contains the quote tag');
  }
  return `$seed$${text}$seed$::jsonb`;
}

function catalogSql({ userId, avatarPath, routes, places }) {
  return `
begin;

-- Mark the welcome email as sent before finishing the profile, so the trigger never mails it.
update public.user_settings set welcome_email_sent_at = coalesce(welcome_email_sent_at, now())
where user_id = '${userId}';

update public.profiles set
  handle = ${jsonLiteral(OFFICIAL_PROFILE)} ->> 'handle',
  name = ${jsonLiteral(OFFICIAL_PROFILE)} ->> 'name',
  bio = ${jsonLiteral(OFFICIAL_PROFILE)} ->> 'bio',
  avatar_path = '${avatarPath}',
  is_official = true,
  profile_completed = true
where id = '${userId}';

with data as (select e from jsonb_array_elements(${jsonLiteral(routes)}) e)
insert into public.routes (
  id, author_id, name, summary, tag, city, start_name, end_name, distance_km, duration_minutes,
  average_speed_kmh, max_speed_kmh, curve_count, break_count, elevation_gain_m, elevation_loss_m,
  difficulty, surface, notes, stops, cover_path, photo_paths, path, is_loop, popularity, rating,
  rating_count, featured_rank, home_rank, status, published_at
)
select
  e ->> 'id', '${userId}', e ->> 'name', e ->> 'summary', e ->> 'tag', e ->> 'city',
  e ->> 'startName', e ->> 'endName', (e ->> 'distanceKm')::double precision,
  round((e ->> 'durationMinutes')::numeric)::integer, (e ->> 'averageSpeedKmh')::double precision,
  (e ->> 'maxSpeedKmh')::double precision, (e ->> 'curveCount')::integer, (e ->> 'breakCount')::integer,
  (e ->> 'elevationGainM')::integer, (e ->> 'elevationLossM')::integer, e ->> 'difficulty',
  e ->> 'surface', e ->> 'notes', e -> 'stops', e ->> 'coverPath',
  array(select jsonb_array_elements_text(e -> 'photoPaths')),
  extensions.st_setsrid(extensions.st_geomfromgeojson((e -> 'path')::text), 4326),
  (e ->> 'isLoop')::boolean, (e ->> 'popularity')::integer, (e ->> 'rating')::double precision,
  (e ->> 'ratingCount')::integer, (e ->> 'featuredRank')::integer, (e ->> 'homeRank')::integer,
  'published', (e ->> 'publishedAt')::timestamptz
from data
on conflict (id) do update set
  author_id = excluded.author_id, name = excluded.name, summary = excluded.summary,
  tag = excluded.tag, city = excluded.city, start_name = excluded.start_name,
  end_name = excluded.end_name, distance_km = excluded.distance_km,
  duration_minutes = excluded.duration_minutes, average_speed_kmh = excluded.average_speed_kmh,
  max_speed_kmh = excluded.max_speed_kmh, curve_count = excluded.curve_count,
  break_count = excluded.break_count, elevation_gain_m = excluded.elevation_gain_m,
  elevation_loss_m = excluded.elevation_loss_m, difficulty = excluded.difficulty,
  surface = excluded.surface, notes = excluded.notes, stops = excluded.stops,
  cover_path = excluded.cover_path, photo_paths = excluded.photo_paths, path = excluded.path,
  is_loop = excluded.is_loop, popularity = excluded.popularity, rating = excluded.rating,
  rating_count = excluded.rating_count, featured_rank = excluded.featured_rank,
  home_rank = excluded.home_rank, status = excluded.status, published_at = excluded.published_at;

with data as (select e from jsonb_array_elements(${jsonLiteral(places)}) e)
insert into public.places (id, name, district, province, centre)
select
  e ->> 'id', e ->> 'name', e ->> 'district', e ->> 'province',
  extensions.st_setsrid(
    extensions.st_makepoint((e -> 'centre' ->> 0)::double precision, (e -> 'centre' ->> 1)::double precision),
    4326
  )::extensions.geography
from data
on conflict (id) do update set
  name = excluded.name, district = excluded.district, province = excluded.province,
  centre = excluded.centre;

commit;

select 'routes ' || count(*) from public.routes where author_id = '${userId}';
select 'places ' || count(*) from public.places;
`;
}

// ---------------------------------------------------------------------------------------------

const fixtures = loadFixtures();
const routeFixtures = fixtures.ROUTE_FIXTURES;
const homeIds = fixtures.RECOMMENDED_ROUTE_IDS;
const listIds = fixtures.RECOMMENDED_LIST_IDS;
const placeFixtures = fixtures.PLACE_FIXTURES;

const userId = await ensureOfficialUser();
const avatarPath = await upload('avatars', `${userId}/avatar.png`, AVATAR_FILE);
for (const [file, path] of BRAND_ASSETS) {
  await upload('public-assets', path, join(BRAND_DIR, file));
}

// Every photo file the fixtures use, uploaded once.
const photoFiles = new Set(routeFixtures.flatMap((route) => [route.coverImage, ...route.photos]));
for (const file of photoFiles) {
  if (typeof file !== 'string') {
    throw new Error(`unexpected image source ${JSON.stringify(file)}`);
  }
  await upload('route-photos', `${ROUTE_PHOTO_PREFIX}/${basename(file)}`, file);
}
const photoPath = (file) => `${ROUTE_PHOTO_PREFIX}/${basename(file)}`;

const rank = (ids, id) => (ids.includes(id) ? ids.indexOf(id) + 1 : null);
const routes = routeFixtures.map((route) => ({
  id: route.id,
  name: route.name,
  summary: route.summary,
  tag: route.tag,
  city: route.city,
  startName: route.startName,
  endName: route.endName,
  distanceKm: route.distanceKm,
  durationMinutes: route.durationMinutes,
  averageSpeedKmh: route.averageSpeedKmh,
  maxSpeedKmh: route.maxSpeedKmh,
  curveCount: route.curveCount,
  breakCount: route.breakCount,
  elevationGainM: route.elevationGainM,
  elevationLossM: route.elevationLossM,
  difficulty: route.difficulty,
  surface: route.surface,
  notes: route.notes ?? null,
  stops: route.stops ?? null,
  coverPath: photoPath(route.coverImage),
  photoPaths: route.photos.map(photoPath),
  path: { type: 'LineString', coordinates: route.coordinates },
  isLoop: route.isLoop,
  popularity: route.popularity,
  rating: route.rating,
  ratingCount: route.ratingCount,
  featuredRank: rank(listIds, route.id),
  homeRank: rank(homeIds, route.id),
  publishedAt: route.publishedAt,
}));

const placeById = new Map(placeFixtures.map((place) => [place.id, place]));
const places = [
  ...placeFixtures.map(({ id, name, district, province, centre }) => ({ id, name, district, province, centre })),
  ...EXTRA_PLACES.map(({ centreFrom, centre, ...place }) => ({
    ...place,
    centre: centre ?? placeById.get(centreFrom).centre,
  })),
];

// The signup trigger creates the profile row the routes point at.
const output = runSql(
  `select count(*) from public.profiles where id = '${userId}';`,
);
if (output !== '1') {
  throw new Error(`profile row for ${OFFICIAL_EMAIL} is missing`);
}
console.log(runSql(catalogSql({ userId, avatarPath, routes, places })));
console.log(`done: ${routes.length} routes, ${places.length} places, author ${userId}`);
