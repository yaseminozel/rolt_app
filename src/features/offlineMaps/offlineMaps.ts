import { useSyncExternalStore } from 'react';

import { isNativeMapAvailable } from '@/components/map/BaseMap';
import type { Route } from '@/features/routes/types';
import { deviceStore } from '@/lib/deviceStore';

/**
 * Offline maps per route (user decision 2026-10-09): the map around a route is downloaded as a
 * Mapbox offline pack, so the route's map — Rota detayı, Hazırlık, navigation, Kayıt — still
 * draws where mountain roads lose signal. The pack covers the route line plus a margin at riding
 * zooms, in the app's own map style (satellite isn't downloaded). The ride plan itself still needs
 * a connection when it is made (Hazırlık); after that the ride needs none. Mapbox needs a
 * development / production build, so in Expo Go and on the web nothing is offered.
 */
export const OFFLINE_MAP_RULES = {
  /** Around the route line, degrees (≈ 3 km), so a detour or a stop just off it is covered. */
  marginDeg: 0.03,
  minZoom: 9,
  /** Navigation and recording ride at 15.5–16.5; zoom 15 tiles are overzoomed from there. */
  maxZoom: 15,
} as const;

export type OfflineMapState = 'downloading' | 'ready' | 'failed';

export type OfflineMap = {
  routeId: string;
  /** Kept with the pack so "İndirdiğin rotalar" can list the route without a connection. */
  route: Route;
  state: OfflineMapState;
  /** 0–1 while downloading. */
  progress: number;
  sizeBytes: number;
  downloadedAt: number | null;
};

const KEY = 'rolt.offlineMaps';
const packName = (routeId: string) => `route-${routeId}`;

export const offlineMapsSupported = isNativeMapAvailable;

type MapboxOffline = typeof import('@/components/map/NativeBaseMap')['mapboxOffline'];

function mapbox(): MapboxOffline | null {
  if (!offlineMapsSupported) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: not in Expo Go
    return (require('@/components/map/NativeBaseMap') as typeof import('@/components/map/NativeBaseMap'))
      .mapboxOffline;
  } catch {
    return null;
  }
}

function read(): Record<string, OfflineMap> {
  try {
    const raw = deviceStore.getSync(KEY);
    return raw ? (JSON.parse(raw) as Record<string, OfflineMap>) : {};
  } catch {
    return {};
  }
}

let maps: Record<string, OfflineMap> = offlineMapsSupported ? read() : {};
const listeners = new Set<() => void>();

function commit(next: Record<string, OfflineMap>) {
  maps = next;
  listeners.forEach((listener) => listener());
  // Only finished maps outlive the app; a download cut off by a kill is resumed by `restore`.
  const kept = Object.fromEntries(
    Object.entries(next).filter(([, map]) => map.state !== 'failed'),
  );
  deviceStore.set(KEY, JSON.stringify(kept)).catch(() => undefined);
}

function patch(routeId: string, changes: Partial<OfflineMap>) {
  const current = maps[routeId];
  if (current) {
    commit({ ...maps, [routeId]: { ...current, ...changes } });
  }
}

function bounds(route: Route): [[number, number], [number, number]] {
  const lngs = route.coordinates.map(([lng]) => lng);
  const lats = route.coordinates.map(([, lat]) => lat);
  const { marginDeg } = OFFLINE_MAP_RULES;
  return [
    [Math.max(...lngs) + marginDeg, Math.max(...lats) + marginDeg],
    [Math.min(...lngs) - marginDeg, Math.min(...lats) - marginDeg],
  ];
}

function listen(offline: MapboxOffline, routeId: string) {
  return {
    progress: (_pack: unknown, status: { state: unknown; percentage: number; completedResourceSize: number }) => {
      const done = status.state === offline.completeState || status.percentage >= 100;
      patch(routeId, {
        state: done ? 'ready' : 'downloading',
        progress: Math.min(1, status.percentage / 100),
        sizeBytes: status.completedResourceSize,
        downloadedAt: done ? Date.now() : null,
      });
    },
    error: () => {
      patch(routeId, { state: 'failed' });
      offline.manager.deletePack(packName(routeId)).catch(() => undefined);
    },
  };
}

export const offlineMaps = {
  /** Starts downloading the map around `route`; progress and the result arrive in the store. */
  async download(route: Route) {
    const offline = mapbox();
    if (!offline || maps[route.id]?.state === 'downloading') {
      return;
    }
    // The stored record opens the route offline (navigation too), so it needs the exact line of
    // `getById`, never a list's simplified copy (Rota detayı passes the full route).
    if (route.geometryDetail === 'simplified') {
      if (__DEV__) {
        console.warn('offlineMaps.download needs the full route (getById), got a list copy');
      }
      return;
    }
    commit({
      ...maps,
      [route.id]: {
        routeId: route.id,
        route,
        state: 'downloading',
        progress: 0,
        sizeBytes: 0,
        downloadedAt: null,
      },
    });
    const handlers = listen(offline, route.id);
    try {
      // A failed earlier try may have left a pack under the same name.
      await offline.manager.deletePack(packName(route.id)).catch(() => undefined);
      await offline.manager.createPack(
        {
          name: packName(route.id),
          styleURL: offline.styleURL,
          bounds: bounds(route),
          minZoom: OFFLINE_MAP_RULES.minZoom,
          maxZoom: OFFLINE_MAP_RULES.maxZoom,
          metadata: { routeId: route.id },
        },
        handlers.progress,
        handlers.error,
      );
    } catch {
      patch(route.id, { state: 'failed' });
    }
  },

  async remove(routeId: string) {
    const offline = mapbox();
    const { [routeId]: _removed, ...rest } = maps;
    commit(rest);
    await offline?.manager.deletePack(packName(routeId)).catch(() => undefined);
  },

  /** On launch: picks up downloads the app was killed in the middle of. */
  async restore() {
    const pending = Object.values(maps).filter((map) => map.state === 'downloading');
    // Loading Mapbox only when there is something to pick up keeps it off the launch path.
    const offline = pending.length > 0 ? mapbox() : null;
    if (!offline) {
      return;
    }
    for (const map of pending) {
      try {
        const pack = await offline.manager.getPack(packName(map.routeId));
        if (!pack) {
          patch(map.routeId, { state: 'failed' });
          continue;
        }
        const handlers = listen(offline, map.routeId);
        await offline.manager.subscribe(packName(map.routeId), handlers.progress, handlers.error);
        await pack.resume();
      } catch {
        patch(map.routeId, { state: 'failed' });
      }
    }
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The offline map of one route, `undefined` when it has none. */
export function useOfflineMap(routeId: string | undefined) {
  return useSyncExternalStore(subscribe, () => (routeId ? maps[routeId] : undefined));
}

/** All offline maps, newest download first. */
export function useOfflineMaps() {
  const snapshot = useSyncExternalStore(subscribe, () => maps);
  return Object.values(snapshot).sort(
    (a, b) => (b.downloadedAt ?? Number.MAX_SAFE_INTEGER) - (a.downloadedAt ?? Number.MAX_SAFE_INTEGER),
  );
}

/** The route record kept with an offline map, so the route opens without a connection. */
export function offlineRoute(routeId: string): Route | undefined {
  return maps[routeId]?.route;
}
