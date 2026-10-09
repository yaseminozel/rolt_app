import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  createNavigationLocationSource,
  isSimulatedNavigation,
} from '@/features/navigation/location';
import { leanCalibration } from '@/features/lean/leanCalibration';
import { LEAN_SENSOR_RULES } from '@/features/lean/leanMath';
import { subscribeLean } from '@/features/lean/leanSensor';
import type { LocationFix, LocationSource } from '@/features/navigation/types';
import { ROUTE_FIXTURES } from '@/features/routes/fixtures/routes';
import type { LngLat } from '@/features/routes/types';
import { i18n } from '@/i18n';

import { RECORDER_RULES, RideRecorder, type RecorderSnapshot } from './rideRecorder';
import { ridesRepository } from './ridesRepository';
import { nearestCityName } from './rideTitle';
import type { RideType } from './rideTypes';
import { EMPTY_RIDE_STATS, type RideRecord } from './types';

/** A ride shorter than this can't be saved (08.04 "Kaydetmek için en az 1 km sür"). */
export const MIN_SAVE_DISTANCE_M = 1_000;
/** The recording row is rewritten this often, so a crash loses at most this much (08.03). */
const PERSIST_INTERVAL_MS = 10_000;
const TICK_MS = 1_000;
/** Lean readings while recording (10 Hz is plenty for peak lean). */
const LEAN_RECORD_INTERVAL_MS = 100;
/** The web preview and Expo Go ride along this route when no route is attached. */
const SIMULATION_FALLBACK_ROUTE = 'geyikbayiri';

/** GPS before "Başlat" (08.01): banner "GPS alınıyor.." until a usable fix, then "GPS hazır". */
export type PreviewGps = 'searching' | 'ready';

export type ActiveRecording = {
  rideId: string;
  rideType: RideType;
  routeId?: string;
  snapshot: RecorderSnapshot;
};

export type StartOptions = {
  rideType: RideType;
  route?: { id: string; name: string; line: LngLat[] };
};

export type FinishResult = { kind: 'tooShort'; rideId: string } | { kind: 'draft'; rideId: string };

type RideRecordingValue = {
  /** `undefined` until the device storage has been checked for an interrupted ride. */
  interrupted: RideRecord | null | undefined;
  active: ActiveRecording | null;
  preview: {
    gps: PreviewGps;
    /** When GPS became ready, for the short "GPS hazır" banner. */
    readySince: number | null;
    position: LngLat | null;
    headingDeg: number | null;
  };
  /** Watches GPS while the Ready screen is open; returns the stop function. */
  startPreview: () => () => void;
  start: (options: StartOptions) => Promise<void>;
  pause: () => void;
  /** The ride type can change while riding (08.02 strip). */
  setRideType: (rideType: RideType) => void;
  resume: () => void;
  /** Ends the recording into a draft for "Sürüşü kaydet", or refuses a too-short ride. */
  finish: () => Promise<FinishResult>;
  /** Deletes the current or the interrupted recording (confirmed by the caller). */
  discard: () => Promise<void>;
  /** 08.03 "Devam et": continues the interrupted ride, paused until the rider resumes. */
  restoreInterrupted: () => Promise<void>;
};

const RideRecordingContext = createContext<RideRecordingValue | null>(null);

const newRideId = () => `ride-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function locationSource(line: LngLat[] | undefined): LocationSource {
  const fallback = ROUTE_FIXTURES.find((route) => route.id === SIMULATION_FALLBACK_ROUTE);
  return createNavigationLocationSource({
    line: line ?? fallback?.coordinates ?? [],
    stops: [],
    notification: {
      title: i18n.t('rides:record.notificationTitle'),
      body: i18n.t('rides:record.notificationBody'),
    },
  });
}

/**
 * Owns the ride recording for the whole app (mounted at the root), so it keeps running while the
 * rider switches tabs or the app is in the background. The recording is written to the device
 * every few seconds and on every pause, so a killed app can be recovered (08.03).
 */
export function RideRecordingProvider({ children }: { children: ReactNode }) {
  const [interrupted, setInterrupted] = useState<RideRecord | null | undefined>(undefined);
  const [active, setActive] = useState<ActiveRecording | null>(null);
  const [preview, setPreview] = useState<RideRecordingValue['preview']>({
    gps: 'searching',
    readySince: null,
    position: null,
    headingDeg: null,
  });

  const recorderRef = useRef<RideRecorder | null>(null);
  const recordRef = useRef<RideRecord | null>(null);
  const sourceRef = useRef<LocationSource | null>(null);
  const stopSourceRef = useRef<(() => void) | null>(null);
  const leanSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPersistRef = useRef(0);

  useEffect(() => {
    ridesRepository
      .findInterrupted()
      .then((ride) => setInterrupted(ride))
      .catch(() => setInterrupted(null));
  }, []);

  const persist = useCallback(async () => {
    const recorder = recorderRef.current;
    const record = recordRef.current;
    if (!recorder || !record) {
      return;
    }
    const snapshot = recorder.snapshot();
    const next: RideRecord = {
      ...record,
      stats: snapshot.stats,
      track: snapshot.track,
      updatedAt: Date.now(),
    };
    recordRef.current = next;
    lastPersistRef.current = Date.now();
    await ridesRepository.put(next);
  }, []);

  const publish = useCallback(() => {
    const recorder = recorderRef.current;
    const record = recordRef.current;
    if (!recorder || !record) {
      return;
    }
    setActive({
      rideId: record.id,
      rideType: record.rideType,
      routeId: record.routeId,
      snapshot: recorder.snapshot(),
    });
  }, []);

  const handleFix = useCallback(
    (fix: LocationFix) => {
      const recorder = recorderRef.current;
      const record = recordRef.current;
      if (!recorder || !record) {
        return;
      }
      recorder.addFix(fix);
      if (!record.city && fix.accuracyM <= RECORDER_RULES.weakAccuracyM) {
        recordRef.current = { ...record, city: nearestCityName(fix.coordinates) };
      }
      publish();
      if (Date.now() - lastPersistRef.current >= PERSIST_INTERVAL_MS) {
        persist().catch(() => undefined);
      }
    },
    [persist, publish],
  );

  const stopTracking = useCallback(() => {
    leanSubscriptionRef.current?.remove();
    leanSubscriptionRef.current = null;
    stopSourceRef.current?.();
    stopSourceRef.current = null;
    sourceRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTracking = useCallback(
    async (line: LngLat[] | undefined) => {
      stopTracking();
      const source = locationSource(line);
      sourceRef.current = source;
      stopSourceRef.current = await source.start(handleFix);
      tickRef.current = setInterval(() => {
        recorderRef.current?.tick(source.now());
        publish();
      }, TICK_MS);
      // Calibrated phones measure lean with the motion sensors (08.00); others keep the GPS estimate.
      const calibration = leanCalibration.get();
      if (calibration) {
        let smoothed: number | null = null;
        leanSubscriptionRef.current = subscribeLean((sample) => {
          const lean = sample.rawDeg - calibration.offsetDeg;
          smoothed =
            smoothed === null
              ? lean
              : smoothed + (lean - smoothed) * LEAN_SENSOR_RULES.smoothing;
          recorderRef.current?.addSensorLean(smoothed);
        }, LEAN_RECORD_INTERVAL_MS);
      }
    },
    [handleFix, publish, stopTracking],
  );

  useEffect(() => stopTracking, [stopTracking]);

  const startPreview = useCallback(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    setPreview((current) => ({ ...current, gps: 'searching', readySince: null }));
    if (isSimulatedNavigation) {
      // The simulator has no warm-up; show the search briefly so the banner states are visible.
      const fallback = ROUTE_FIXTURES.find((route) => route.id === SIMULATION_FALLBACK_ROUTE);
      const timer = setTimeout(
        () =>
          setPreview({
            gps: 'ready',
            readySince: Date.now(),
            position: fallback?.coordinates[0] ?? null,
            headingDeg: null,
          }),
        1_500,
      );
      return () => clearTimeout(timer);
    }
    locationSource(undefined)
      .start((fix) => {
        const ready = fix.accuracyM <= RECORDER_RULES.readyAccuracyM;
        setPreview((current) => ({
          gps: ready ? 'ready' : 'searching',
          readySince: ready ? (current.readySince ?? Date.now()) : null,
          position: fix.coordinates,
          headingDeg: fix.headingDeg,
        }));
      })
      .then((stopSource) => {
        if (cancelled) {
          stopSource();
        } else {
          stop = stopSource;
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const start = useCallback(
    async ({ rideType, route }: StartOptions) => {
      const now = Date.now();
      const visibility = await ridesRepository.defaultVisibility();
      const record: RideRecord = {
        id: newRideId(),
        status: 'recording',
        rideType,
        routeId: route?.id,
        routeName: route?.name,
        title: '',
        notes: '',
        difficulty: 'moderate',
        surface: 'asphalt',
        visibility,
        photos: [],
        startedAt: now,
        updatedAt: now,
        stats: { ...EMPTY_RIDE_STATS },
        track: [],
        synced: false,
      };
      recordRef.current = record;
      await ridesRepository.put(record);
      setInterrupted(null);
      recorderRef.current = new RideRecorder(now, undefined, {
        sensorLean: leanCalibration.get() !== null,
      });
      publish();
      await startTracking(route?.line);
    },
    [publish, startTracking],
  );

  const pause = useCallback(() => {
    const now = sourceRef.current?.now() ?? Date.now();
    recorderRef.current?.pause(now);
    publish();
    persist().catch(() => undefined);
  }, [persist, publish]);

  const setRideType = useCallback(
    (rideType: RideType) => {
      if (!recordRef.current) {
        return;
      }
      recordRef.current = { ...recordRef.current, rideType };
      publish();
      persist().catch(() => undefined);
    },
    [persist, publish],
  );

  const resume = useCallback(() => {
    const now = sourceRef.current?.now() ?? Date.now();
    recorderRef.current?.resume(now);
    publish();
    persist().catch(() => undefined);
  }, [persist, publish]);

  const clear = useCallback(() => {
    stopTracking();
    recorderRef.current = null;
    recordRef.current = null;
    setActive(null);
  }, [stopTracking]);

  const finish = useCallback(async (): Promise<FinishResult> => {
    const recorder = recorderRef.current;
    const record = recordRef.current;
    if (!recorder || !record) {
      throw new Error('No recording to finish');
    }
    recorder.pause(sourceRef.current?.now() ?? Date.now());
    const snapshot = recorder.snapshot();
    publish();
    if (snapshot.stats.distanceM < MIN_SAVE_DISTANCE_M) {
      persist().catch(() => undefined);
      return { kind: 'tooShort', rideId: record.id };
    }
    const draft: RideRecord = {
      ...record,
      status: 'draft',
      stats: snapshot.stats,
      track: snapshot.track,
      endedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await ridesRepository.put(draft);
    clear();
    return { kind: 'draft', rideId: draft.id };
  }, [clear, persist, publish]);

  const discard = useCallback(async () => {
    const id = recordRef.current?.id ?? interrupted?.id;
    clear();
    setInterrupted(null);
    if (id) {
      await ridesRepository.remove(id);
    }
  }, [clear, interrupted]);

  const restoreInterrupted = useCallback(async () => {
    if (!interrupted) {
      return;
    }
    recordRef.current = interrupted;
    setInterrupted(null);
    recorderRef.current = new RideRecorder(
      Date.now(),
      { stats: interrupted.stats, track: interrupted.track },
      { sensorLean: leanCalibration.get() !== null },
    );
    publish();
    // Only the simulator needs the line (it drives along it); real GPS ignores it.
    const route = ROUTE_FIXTURES.find((item) => item.id === interrupted.routeId);
    await startTracking(route?.coordinates);
  }, [interrupted, publish, startTracking]);

  const value = useMemo<RideRecordingValue>(
    () => ({
      interrupted,
      active,
      preview,
      startPreview,
      start,
      pause,
      setRideType,
      resume,
      finish,
      discard,
      restoreInterrupted,
    }),
    [
      active,
      setRideType,
      discard,
      finish,
      interrupted,
      pause,
      preview,
      restoreInterrupted,
      resume,
      start,
      startPreview,
    ],
  );

  return <RideRecordingContext.Provider value={value}>{children}</RideRecordingContext.Provider>;
}

export function useRideRecording() {
  const value = useContext(RideRecordingContext);
  if (!value) {
    throw new Error('useRideRecording must be used inside RideRecordingProvider');
  }
  return value;
}
