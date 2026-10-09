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
import { createLeanLogger } from '@/features/lean/leanLog';
import { subscribeLean } from '@/features/lean/leanSensor';
import type { LocationFix, LocationSource } from '@/features/navigation/types';
import { ROUTE_FIXTURES } from '@/features/routes/fixtures/routes';
import type { LngLat } from '@/features/routes/types';
import { recordingActivityProps } from '@/features/liveActivity/rideActivityProps';
import { LIVE_ACTIVITY_INTERVAL_MS, rideLiveActivity } from '@/features/liveActivity/rideLiveActivity';
import { i18n } from '@/i18n';

import { RECORDER_RULES, RideRecorder, type RecorderSnapshot } from './rideRecorder';
import { TrackView, type TrackViewState } from './trackView';
import { ridesRepository } from './ridesRepository';
import { nearestCityName } from './rideTitle';
import type { RideType } from './rideTypes';
import { EMPTY_RIDE_STATS, type RideRecord } from './types';

/** A ride shorter than this can't be saved (08.04 "Kaydetmek için en az 1 km sür"). */
export const MIN_SAVE_DISTANCE_M = 1_000;
/** The recording row is rewritten this often, so a crash loses at most this much (08.03). */
const PERSIST_INTERVAL_MS = 10_000;
/** Deep link of the Kaydet sheet (`/record-ride`). */
const RECORD_SHEET_URL = 'rolt://record-ride';
const TICK_MS = 1_000;
/** A tick right after a fix has nothing new to show; skipping it halves the renders. */
const TICK_PUBLISH_GAP_MS = 900;
const EMPTY_TRACK_VIEW: TrackViewState = { committed: [], commits: 0, tail: [] };
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

/**
 * The recording's controls and slow-changing state. It doesn't change while riding, so the tab
 * bar and other screens don't re-render on every fix; live numbers come from `useActiveRide`, the
 * map's track from `useRideTrack` (CLAUDE.md "Uzun sürüş performansı").
 */
type RideRecordingValue = {
  /** `undefined` until the device storage has been checked for an interrupted ride. */
  interrupted: RideRecord | null | undefined;
  /** A ride is being recorded (running or paused). */
  isRecording: boolean;
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
/** Totals and state of the running recording, about once a second. */
const ActiveRideContext = createContext<ActiveRecording | null>(null);
/** The running recording's track for the map: a committed part and a live tail. */
const RideTrackContext = createContext<TrackViewState>(EMPTY_TRACK_VIEW);

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
    profile: 'recording',
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
  const [track, setTrack] = useState<TrackViewState>(EMPTY_TRACK_VIEW);
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
  const lastPublishRef = useRef(0);
  const trackViewRef = useRef<TrackView | null>(null);
  /** Points with a `seq` below this are on the device. */
  const persistedSeqRef = useRef(0);
  /** Writes run one after another, so appended points never overtake each other. */
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    ridesRepository
      .findInterrupted()
      .then((ride) => setInterrupted(ride))
      .catch(() => setInterrupted(null));
  }, []);

  /** Queues a device write after the ones before it. */
  const enqueueWrite = useCallback((write: () => Promise<void>) => {
    const next = writeChainRef.current.then(write, write);
    writeChainRef.current = next.catch(() => undefined);
    return next;
  }, []);

  /** Stats plus only the points since the last write (P0: small, so it stays quick on long rides). */
  const persist = useCallback(
    () =>
      enqueueWrite(async () => {
        const recorder = recorderRef.current;
        const record = recordRef.current;
        if (!recorder || !record) {
          return;
        }
        const points = recorder.pointsSince(persistedSeqRef.current);
        const next: RideRecord = {
          ...record,
          stats: recorder.snapshot().stats,
          updatedAt: Date.now(),
        };
        recordRef.current = next;
        lastPersistRef.current = Date.now();
        await ridesRepository.appendRecording(next, points);
        if (points.length > 0) {
          persistedSeqRef.current = points[points.length - 1].seq + 1;
        }
      }),
    [enqueueWrite],
  );

  const publish = useCallback(() => {
    const recorder = recorderRef.current;
    const record = recordRef.current;
    if (!recorder || !record) {
      return;
    }
    lastPublishRef.current = Date.now();
    setActive({
      rideId: record.id,
      rideType: record.rideType,
      routeId: record.routeId,
      snapshot: recorder.snapshot(),
    });
    const view = trackViewRef.current;
    if (view) {
      // Same object while nothing new was drawn, so the map doesn't re-render for it.
      setTrack(view.update((seq) => recorder.pointsSince(seq), Date.now()));
    }
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
        if (Date.now() - lastPublishRef.current >= TICK_PUBLISH_GAP_MS) {
          publish();
        }
      }, TICK_MS);
      // Calibrated phones measure lean with the motion sensors (08.00); others keep the GPS estimate.
      const calibration = leanCalibration.get();
      if (calibration) {
        let smoothed: number | null = null;
        const logLean = createLeanLogger('recording');
        leanSubscriptionRef.current = subscribeLean((sample) => {
          const lean = sample.rawDeg - calibration.offsetDeg;
          smoothed =
            smoothed === null
              ? lean
              : smoothed + (lean - smoothed) * LEAN_SENSOR_RULES.smoothing;
          logLean(smoothed, sample.rawDeg, calibration.offsetDeg);
          recorderRef.current?.addSensorLean(smoothed);
        }, LEAN_RECORD_INTERVAL_MS);
      }
    },
    [handleFix, publish, stopTracking],
  );

  useEffect(() => stopTracking, [stopTracking]);

  // Lock Screen / Dynamic Island (user decision 2026-10-09): one left over from a killed app is
  // stale; a running ride shows and refreshes it, and it goes when the ride is saved or deleted.
  useEffect(() => rideLiveActivity.endStale(), []);
  useEffect(() => {
    if (!active) {
      rideLiveActivity.end();
      return;
    }
    rideLiveActivity.show(
      recordingActivityProps(active.snapshot, Date.now()),
      LIVE_ACTIVITY_INTERVAL_MS.recording,
      // Tapping it opens the Kaydet sheet (from a killed app too: 08.03 recovery shows there).
      RECORD_SHEET_URL,
    );
  }, [active]);

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
      persistedSeqRef.current = 0;
      await enqueueWrite(() => ridesRepository.appendRecording(record, []));
      setInterrupted(null);
      recorderRef.current = new RideRecorder(now, undefined, {
        sensorLean: leanCalibration.get() !== null,
      });
      trackViewRef.current = new TrackView();
      publish();
      await startTracking(route?.line);
    },
    [enqueueWrite, publish, startTracking],
  );

  const pause = useCallback(() => {
    const now = sourceRef.current?.now() ?? Date.now();
    recorderRef.current?.pause(now);
    sourceRef.current?.setPowerMode?.('idle').catch(() => undefined);
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
    sourceRef.current?.setPowerMode?.('active').catch(() => undefined);
    publish();
    persist().catch(() => undefined);
  }, [persist, publish]);

  const clear = useCallback(() => {
    stopTracking();
    recorderRef.current = null;
    recordRef.current = null;
    trackViewRef.current = null;
    setActive(null);
    setTrack(EMPTY_TRACK_VIEW);
  }, [stopTracking]);

  const finish = useCallback(async (): Promise<FinishResult> => {
    const recorder = recorderRef.current;
    const record = recordRef.current;
    if (!recorder || !record) {
      throw new Error('No recording to finish');
    }
    recorder.pause(sourceRef.current?.now() ?? Date.now());
    sourceRef.current?.setPowerMode?.('idle').catch(() => undefined);
    const snapshot = recorder.snapshot();
    publish();
    if (snapshot.stats.distanceM < MIN_SAVE_DISTANCE_M) {
      persist().catch(() => undefined);
      return { kind: 'tooShort', rideId: record.id };
    }
    // The draft carries the whole track; the appended points go once it is written.
    const draft: RideRecord = {
      ...(recordRef.current ?? record),
      status: 'draft',
      stats: snapshot.stats,
      track: recorder.track(),
      endedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await enqueueWrite(() => ridesRepository.put(draft));
    clear();
    return { kind: 'draft', rideId: draft.id };
  }, [clear, enqueueWrite, persist, publish]);

  const discard = useCallback(async () => {
    const id = recordRef.current?.id ?? interrupted?.id;
    clear();
    setInterrupted(null);
    if (id) {
      // After any write still running, so it can't bring the ride back.
      await enqueueWrite(() => ridesRepository.remove(id));
    }
  }, [clear, enqueueWrite, interrupted]);

  const restoreInterrupted = useCallback(async () => {
    if (!interrupted) {
      return;
    }
    const record: RideRecord = { ...interrupted, track: [] };
    recordRef.current = record;
    setInterrupted(null);
    const recorder = new RideRecorder(
      Date.now(),
      { stats: interrupted.stats, track: interrupted.track },
      { sensorLean: leanCalibration.get() !== null },
    );
    recorderRef.current = recorder;
    trackViewRef.current = new TrackView();
    // Its track goes into the point table once (also converting a ride written whole by an
    // older version), before any new point is appended after it.
    const points = recorder.pointsSince(0);
    persistedSeqRef.current = points.length;
    await enqueueWrite(() => ridesRepository.replaceRecording(record, points));
    publish();
    // Only the simulator needs the line (it drives along it); real GPS ignores it.
    const route = ROUTE_FIXTURES.find((item) => item.id === interrupted.routeId);
    await startTracking(route?.coordinates);
    // A restored ride waits paused for "Devam et".
    sourceRef.current?.setPowerMode?.('idle').catch(() => undefined);
  }, [enqueueWrite, interrupted, publish, startTracking]);

  const isRecording = active !== null;
  const value = useMemo<RideRecordingValue>(
    () => ({
      interrupted,
      isRecording,
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
      isRecording,
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

  return (
    <RideRecordingContext.Provider value={value}>
      <ActiveRideContext.Provider value={active}>
        <RideTrackContext.Provider value={track}>{children}</RideTrackContext.Provider>
      </ActiveRideContext.Provider>
    </RideRecordingContext.Provider>
  );
}

function useRecordingControls() {
  const value = useContext(RideRecordingContext);
  if (!value) {
    throw new Error('Ride recording hooks must be used inside RideRecordingProvider');
  }
  return value;
}

/** Controls, state and the live totals together, for the record sheet itself. */
export function useRideRecording() {
  const controls = useRecordingControls();
  const active = useContext(ActiveRideContext);
  return useMemo(() => ({ ...controls, active }), [active, controls]);
}

/** Whether a ride is being recorded; changes only on start and finish. */
export function useIsRecording() {
  return useRecordingControls().isRecording;
}

/** Live totals of the running recording (about once a second), `null` when none. */
export function useActiveRide() {
  return useContext(ActiveRideContext);
}

/** The running recording's track for the map (`TrackView`). */
export function useRideTrack() {
  return useContext(RideTrackContext);
}
