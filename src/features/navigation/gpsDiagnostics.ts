import type { GpsHealthDiagnostics, GpsHealthState } from './gpsHealth';
import type {
  LocationFix,
  LocationPowerMode,
  LocationProfile,
  LocationSource,
  LocationSourceKind,
} from './types';

/**
 * Developer GPS panel data (development builds only): what the location source delivers and
 * what GPS health makes of it. Every writer is called behind `__DEV__`, so production builds
 * never fill it.
 */

/** Fix intervals are averaged over this many gaps. */
const INTERVAL_SAMPLES = 10;
const LOG_SIZE = 20;

export type GpsFixSample = {
  /** Wall-clock arrival. */
  at: number;
  accuracyM: number;
  speedMps: number | null;
};

export type GpsLogEntry =
  | { id: number; at: number; type: 'health'; state: GpsHealthState }
  | { id: number; at: number; type: 'motion'; moving: boolean }
  | { id: number; at: number; type: 'power'; mode: LocationPowerMode }
  | { id: number; at: number; type: 'source'; started: boolean; kind: LocationSourceKind | null };

export type GpsDiagnosticsState = {
  source: {
    kind: LocationSourceKind | null;
    profile: LocationProfile;
    mode: LocationPowerMode;
  } | null;
  /** Newest last; one more than `INTERVAL_SAMPLES` for the gaps. */
  fixes: GpsFixSample[];
  health: GpsHealthDiagnostics | null;
  /** Newest first. */
  log: GpsLogEntry[];
};

let state: GpsDiagnosticsState = { source: null, fixes: [], health: null, log: [] };
/** The source the panel describes (the latest started; a stopped older one doesn't clear it). */
let currentToken: object | null = null;
let nextLogId = 0;
const listeners = new Set<() => void>();

type LogInput =
  | { type: 'health'; state: GpsHealthState }
  | { type: 'motion'; moving: boolean }
  | { type: 'power'; mode: LocationPowerMode }
  | { type: 'source'; started: boolean; kind: LocationSourceKind | null };

function set(next: Partial<GpsDiagnosticsState>, log?: LogInput) {
  state = {
    ...state,
    ...next,
    log: log
      ? [{ ...log, id: nextLogId++, at: Date.now() } as GpsLogEntry, ...state.log].slice(0, LOG_SIZE)
      : (next.log ?? state.log),
  };
  listeners.forEach((listener) => listener());
}

export const gpsDiagnostics = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,

  /** GPS health after a fix or a tick (the recorder's or the tracker's). */
  health(next: GpsHealthDiagnostics) {
    const previous = state.health;
    if (previous && previous.state !== next.state) {
      set({ health: next }, { type: 'health', state: next.state });
    } else if (previous && previous.moving !== next.moving) {
      set({ health: next }, { type: 'motion', moving: next.moving });
    } else if (
      !previous ||
      previous.lastFixAt !== next.lastFixAt ||
      previous.badSince !== next.badSince ||
      previous.weakInMs !== next.weakInMs
    ) {
      set({ health: next }, previous ? undefined : { type: 'health', state: next.state });
    }
  },
};

/** Average gap between the recent fixes, ms; `null` with fewer than two. */
export function averageFixIntervalMs(fixes: GpsFixSample[]) {
  if (fixes.length < 2) {
    return null;
  }
  return (fixes[fixes.length - 1].at - fixes[0].at) / (fixes.length - 1);
}

/**
 * Wraps a location source so its start, stop, fixes and power modes show in the panel. Only
 * called in development builds (`createNavigationLocationSource`).
 */
export function withGpsDiagnostics(source: LocationSource, profile: LocationProfile): LocationSource {
  const token = {};
  let mode: LocationPowerMode = 'active';
  const kind = () => source.kind?.() ?? null;
  const isCurrent = () => currentToken === token;

  return {
    now: () => source.now(),
    kind: source.kind,
    async start(onFix) {
      currentToken = token;
      set({ source: { kind: null, profile, mode }, fixes: [], health: null });
      const stop = await source.start((fix: LocationFix) => {
        if (isCurrent()) {
          const sample = { at: Date.now(), accuracyM: fix.accuracyM, speedMps: fix.speedMps };
          set({ fixes: [...state.fixes, sample].slice(-(INTERVAL_SAMPLES + 1)) });
        }
        onFix(fix);
      });
      if (isCurrent()) {
        set({ source: { kind: kind(), profile, mode } }, { type: 'source', started: true, kind: kind() });
      }
      return () => {
        if (isCurrent()) {
          currentToken = null;
          set({ source: null, health: null }, { type: 'source', started: false, kind: kind() });
        }
        stop();
      };
    },
    async setPowerMode(next) {
      if (next !== mode && isCurrent()) {
        set({ source: { kind: kind(), profile, mode: next } }, { type: 'power', mode: next });
      }
      mode = next;
      await source.setPowerMode?.(next);
    },
  };
}
