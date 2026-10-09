// Reads for the public pages. Always with the anon key: RLS and the read-model RPCs decide what a
// signed-out visitor may see (published routes, public rides with their trimmed preview line,
// riders that aren't suspended), so no page can show more than the app shows a guest.

import { env } from '../_shared/env.ts';

export type LngLat = [number, number];

export type RouteStop = { kind: 'start' | 'stop' | 'end'; name: string; distanceKm: number; durationMinutes: number };

export type RouteAuthor = { id: string; name: string; handle?: string; avatarPath?: string | null; isOfficial?: boolean };

export type Route = {
  id: string;
  name: string;
  summary: string;
  tag: string;
  city: string;
  startName: string;
  endName: string;
  distanceKm: number;
  durationMinutes: number;
  curveCount: number;
  elevationGainM: number;
  difficulty: string;
  surface: string;
  notes: string | null;
  stops: RouteStop[] | null;
  coverPath: string | null;
  photoPaths: string[];
  coordinates: LngLat[];
  author: RouteAuthor | null;
  publishedAt: string;
};

export type Ride = {
  id: string;
  title: string;
  description: string | null;
  rideType: string;
  routeId: string | null;
  routeName: string | null;
  city: string | null;
  startedAt: string;
  distanceM: number;
  durationS: number;
  breakS: number;
  curveCount: number;
  photoPaths: string[];
  /** Start / finish already cut by the owner's privacy setting (10.05), simplified. */
  preview: LngLat[][] | null;
  author: RouteAuthor & { bike?: string | null };
};

export type Rider = {
  id: string;
  name: string;
  handle: string;
  avatarPath: string | null;
  bio: string | null;
  city: string | null;
  followerCount: number;
  rideCount: number;
};

async function anonRpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error(`rpc ${name} failed: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text ? (JSON.parse(text) as T | null) : null;
}

export const getRoute = (id: string) => anonRpc<Route>('route_by_id', { p_id: id });

/** Every visible route, most popular first (the catalog is small; the RPC caps it at 200). */
export async function listRoutes() {
  return (await anonRpc<Route[]>('routes_search', { p_query: '', p_limit: 200 })) ?? [];
}

export const getRide = (id: string) => anonRpc<Ride>('get_ride', { p_id: id });

export async function getRiderByHandle(handle: string) {
  const id = await anonRpc<string>('rider_id_by_handle', { p_handle: handle });
  return id ? anonRpc<Rider>('get_rider', { p_id: id }) : null;
}

/** Public file URL; `width` / `height` go through the image transformer (JPEG for crawlers). */
export function storageUrl(bucket: string, path: string, size?: { width: number; height?: number }) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  if (!size) {
    return `${env.publicUrl}/storage/v1/object/public/${bucket}/${encoded}`;
  }
  const params = new URLSearchParams({ width: String(size.width), resize: size.height ? 'cover' : 'contain', quality: '80' });
  if (size.height) {
    params.set('height', String(size.height));
  }
  return `${env.publicUrl}/storage/v1/render/image/public/${bucket}/${encoded}?${params}`;
}
