#!/usr/bin/env node
/**
 * Generates `src/features/routes/fixtures/routeGeometries.ts`: the road geometry, distance,
 * duration and bend count of each mock route, from Mapbox Directions (driving profile).
 *
 * Usage (Node 24, no dependencies): `nvm use && node scripts/generate-route-geometries.mjs`
 * Reads `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` from `.env`.
 *
 * `PLACES` and `ROUTE_WAYPOINTS` mirror `place` and the seeds' `from` / `via` / `to` in
 * `src/features/routes/fixtures/routes.ts`; keep them in sync and rerun after changing either.
 */
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'src/features/routes/fixtures/routeGeometries.ts');

/** [lng, lat]; road-reachable points (Directions snaps each to the nearest road). */
const PLACES = {
  antalya: [30.7133, 36.8969],
  adrasan: [30.4653, 36.3116],
  cirali: [30.4809, 36.4159],
  olympos: [30.4704, 36.3929],
  gelidonya: [30.415, 36.2636],
  mavikent: [30.3475, 36.3144],
  kumluca: [30.29, 36.37],
  kemer: [30.56, 36.598],
  tekirova: [30.5252, 36.4991],
  geyikbayiri: [30.46, 36.878],
  tahtali: [30.487, 36.5408],
  korkuteli: [30.196, 37.066],
  saklikent: [30.3346, 36.8417],
  termessos: [30.4678, 36.9884],
  kas: [29.637, 36.201],
  kalkan: [29.414, 36.265],
};

/** Route id → places from start to finish. `suluada` (a boat route) is left out on purpose. */
const ROUTE_WAYPOINTS = {
  adrasan: ['kumluca', 'adrasan'],
  geyikbayiri: ['geyikbayiri', 'tahtali'],
  cirali: ['tekirova', 'cirali'],
  'kas-kalkan': ['kas', 'kalkan'],
  'adrasan-cirali': ['adrasan', 'cirali'],
  'adrasan-mountain': ['adrasan', 'tahtali'],
  gelidonya: ['adrasan', 'gelidonya'],
  'adrasan-olympos': ['adrasan', 'olympos'],
  'adrasan-mavikent': ['adrasan', 'mavikent'],
  'adrasan-sunset': ['adrasan', 'gelidonya'],
  'coastal-cruise': ['antalya', 'kemer'],
  'pine-forest': ['antalya', 'termessos'],
  'tahtali-foothills': ['kemer', 'tahtali'],
  'korkuteli-curves': ['antalya', 'korkuteli', 'antalya'],
  'olympos-cirali': ['olympos', 'cirali'],
  saklikent: ['antalya', 'saklikent'],
  'kemer-tekirova': ['kemer', 'tekirova'],
  termessos: ['antalya', 'termessos'],
};

/** Douglas–Peucker tolerance; raised step by step while a line has more than `MAX_POINTS`. */
const SIMPLIFY_TOLERANCE_M = 12;
const MAX_POINTS = 400;
const DECIMALS = 5;

// --- Bend counter: a port of `CurveCounter` in src/features/rides/rideRecorder.ts. ---

const CURVE_RULES = {
  curveSampleM: 25,
  curveMinTurnDeg: 45,
  curveWindowM: 150,
  curveStraightDeg: 4,
};

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

function distanceM([lng1, lat1], [lng2, lat2]) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bearingDeg([lng1, lat1], [lng2, lat2]) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lng2 - lng1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

const normalizeTurn = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

function countCurves(line) {
  let anchor = null;
  let prevBearing = null;
  let turnSum = 0;
  let run = 0;
  let counted = false;
  let count = 0;
  for (const point of line) {
    if (!anchor) {
      anchor = point;
      continue;
    }
    if (distanceM(anchor, point) < CURVE_RULES.curveSampleM) {
      continue;
    }
    const bearing = bearingDeg(anchor, point);
    anchor = point;
    if (prevBearing === null) {
      prevBearing = bearing;
      continue;
    }
    const turn = normalizeTurn(bearing - prevBearing);
    prevBearing = bearing;
    const straight = Math.abs(turn) < CURVE_RULES.curveStraightDeg;
    const sameDirection = Math.sign(turn) === Math.sign(turnSum) || turnSum === 0;
    if (straight || !sameDirection) {
      turnSum = straight ? 0 : turn;
      run = 0;
      counted = false;
      continue;
    }
    turnSum += turn;
    run += CURVE_RULES.curveSampleM;
    if (run > CURVE_RULES.curveWindowM) {
      turnSum = turn;
      run = CURVE_RULES.curveSampleM;
    }
    if (!counted && Math.abs(turnSum) >= CURVE_RULES.curveMinTurnDeg) {
      counted = true;
      count += 1;
    }
  }
  return count;
}

// --- Douglas–Peucker on a local planar projection (metres). ---

function simplify(line, toleranceM) {
  const latitude = toRadians(line.reduce((sum, [, lat]) => sum + lat, 0) / line.length);
  const xy = line.map(([lng, lat]) => [lng * 111_320 * Math.cos(latitude), lat * 110_540]);
  const keep = new Uint8Array(line.length);
  keep[0] = 1;
  keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    const [ax, ay] = xy[first];
    const [bx, by] = xy[last];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    let farthest = -1;
    let farthestDistance = toleranceM;
    for (let index = first + 1; index < last; index += 1) {
      const [px, py] = xy[index];
      const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
      const distance = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (distance > farthestDistance) {
        farthest = index;
        farthestDistance = distance;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return line.filter((_, index) => keep[index]);
}

function simplifyToCap(line) {
  let tolerance = SIMPLIFY_TOLERANCE_M;
  let result = simplify(line, tolerance);
  while (result.length > MAX_POINTS) {
    tolerance *= 1.25;
    result = simplify(line, tolerance);
  }
  return { line: result, toleranceM: tolerance };
}

const round = (value) => Number(value.toFixed(DECIMALS));

// --- Mapbox Directions. ---

function readToken() {
  const env = readFileSync(join(ROOT, '.env'), 'utf8');
  const match = env.match(/^\s*EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN\s*=\s*["']?([^"'\s]*)/m);
  const token = match?.[1] ?? '';
  if (!token.startsWith('pk.') || token.length <= 3) {
    throw new Error('Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN (pk.…) in .env first.');
  }
  return token;
}

async function directions(token, points) {
  const path = points.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const query = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    steps: 'false',
    alternatives: 'false',
    access_token: token,
  });
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}?${query}`);
  const body = await response.json().catch(() => ({}));
  // Never print the request URL: it carries the token.
  if (!response.ok || body.code !== 'Ok') {
    throw new Error(`Directions failed (${response.status}): ${body.message ?? body.code ?? 'no message'}`);
  }
  return body;
}

// --- Output. ---

function formatLine(line) {
  const points = line.map(([lng, lat]) => `[${lng}, ${lat}]`);
  const rows = [];
  for (let index = 0; index < points.length; index += 6) {
    rows.push(`      ${points.slice(index, index + 6).join(', ')},`);
  }
  return rows.join('\n');
}

async function main() {
  const token = readToken();
  const entries = [];
  const summary = [];
  for (const [id, keys] of Object.entries(ROUTE_WAYPOINTS)) {
    const body = await directions(token, keys.map((key) => PLACES[key]));
    const [best] = body.routes;
    const full = best.geometry.coordinates;
    const { line, toleranceM } = simplifyToCap(full);
    const coordinates = line.map(([lng, lat]) => [round(lng), round(lat)]);
    const geometry = {
      distanceKm: Math.round(best.distance / 100) / 10,
      durationMinutes: Math.round(best.duration / 60),
      curveCount: countCurves(full),
    };
    entries.push(
      [
        `  ${/^[a-z][a-zA-Z0-9]*$/.test(id) ? id : `'${id}'`}: {`,
        `    distanceKm: ${geometry.distanceKm},`,
        `    durationMinutes: ${geometry.durationMinutes},`,
        `    curveCount: ${geometry.curveCount},`,
        '    coordinates: [',
        formatLine(coordinates),
        '    ],',
        '  },',
      ].join('\n'),
    );
    summary.push({
      id,
      km: geometry.distanceKm,
      min: geometry.durationMinutes,
      curves: geometry.curveCount,
      curvesSimplified: countCurves(coordinates),
      points: `${full.length}→${coordinates.length}`,
      toleranceM: Math.round(toleranceM),
      snapsM: body.waypoints.map((waypoint) => Math.round(waypoint.distance)).join('/'),
    });
  }

  const source = [
    '// GENERATED by scripts/generate-route-geometries.mjs — do not edit by hand.',
    '// Regenerate: `nvm use && node scripts/generate-route-geometries.mjs` (Mapbox token in .env).',
    '// Mapbox Directions (driving) through each mock route\'s places; lines simplified with',
    `// Douglas–Peucker (≥ ${SIMPLIFY_TOLERANCE_M} m, at most ${MAX_POINTS} points), bends counted on the full line.`,
    "import type { LngLat } from '../types';",
    '',
    'export type RouteGeometry = {',
    '  coordinates: LngLat[];',
    '  distanceKm: number;',
    '  durationMinutes: number;',
    '  curveCount: number;',
    '};',
    '',
    'export const ROUTE_GEOMETRIES: Record<string, RouteGeometry> = {',
    ...entries,
    '};',
    '',
  ].join('\n');
  writeFileSync(OUTPUT, source);
  console.table(summary);
  console.log(`Wrote ${OUTPUT} (${(Buffer.byteLength(source) / 1024).toFixed(1)} KB)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
