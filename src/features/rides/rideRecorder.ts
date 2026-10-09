import { bearingDeg, distanceM } from '@/features/navigation/geometry';
import type { LocationFix } from '@/features/navigation/types';
import type { LngLat } from '@/features/routes/types';

import { SensorLeanTracker } from '@/features/lean/leanMath';

import { LeanEstimator } from './leanAngle';
import { EMPTY_RIDE_STATS, type RideStats } from './types';

/** Thresholds of the ride recorder; written to CLAUDE.md's decision table. */
export const RECORDER_RULES = {
  /** Fixes worse than this pause the recording ("GPS zayıf, kayıt duraklatıldı"), like navigation. */
  weakAccuracyM: 50,
  /** No fix for this long also pauses it (GPS lost). */
  lostAfterMs: 30_000,
  /** Before "Başlat", a fix this accurate means "GPS hazır". */
  readyAccuracyM: 30,
  /** Track points closer than this are dropped (standing jitter). */
  minStepM: 5,
  /** Faster than this between two fixes is a GPS jump, not riding (~250 km/h). */
  maxPlausibleSpeedMps: 70,
  /** Below this speed the rider counts as standing. */
  standingSpeedMps: 1,
  /** Standing this long while recording is one break ("Mola"). */
  breakAfterS: 60,
  /** Bends are measured on track points resampled this far apart. */
  curveSampleM: 25,
  /** Same-direction turning of at least this much, within `curveWindowM`, is one bend ("Viraj"). */
  curveMinTurnDeg: 45,
  curveWindowM: 150,
  /** A sample turning less than this ends the bend being measured. */
  curveStraightDeg: 4,
} as const;

/** `recording` and `paused` are the rider's choice; `autoPaused` is the system's (rule E). */
export type RecorderPhase = 'recording' | 'paused';

export type GpsQuality = 'searching' | 'good' | 'weak' | 'lost';

/**
 * Totals and state of a recording, cheap to take on every fix: the track is not in it (read it
 * with `track()` / `pointsSince()`; `trackVersion` says when it changed).
 */
export type RecorderSnapshot = {
  phase: RecorderPhase;
  /** Recording but not counting because GPS is weak or lost (rule E: never pretend to record). */
  autoPaused: boolean;
  gps: GpsQuality;
  stats: RideStats;
  /** Average over riding time (recorded time minus breaks), m/s. */
  averageSpeedMps: number;
  position: LngLat | null;
  headingDeg: number | null;
  /** Bumped whenever a point or segment is added. */
  trackVersion: number;
  /** Points recorded so far (also the `seq` the next point gets). */
  pointCount: number;
};

/** A track point in recording order: `seq` counts from 0, `segment` indexes `track()` gaps. */
export type TrackPoint = { seq: number; segment: number; coordinates: LngLat };

/** What a recording restored after a crash continues from (08.03). */
export type RecorderResumeState = {
  stats: RideStats;
  track: LngLat[][];
};

const normalizeTurn = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Counts bends ("Viraj") along a track: points are resampled every `curveSampleM`, and turning
 * the same way by at least `curveMinTurnDeg` within `curveWindowM` is one bend.
 */
export class CurveCounter {
  private anchor: LngLat | null = null;
  private prevBearing: number | null = null;
  private turn = 0;
  private run = 0;
  private counted = false;

  /** A gap in the track (pause, GPS loss): don't measure across it. */
  breakTrack() {
    this.anchor = null;
    this.prevBearing = null;
    this.turn = 0;
    this.run = 0;
    this.counted = false;
  }

  /** Adds a track point; true when it completes a new bend. */
  add(point: LngLat): boolean {
    if (!this.anchor) {
      this.anchor = point;
      return false;
    }
    if (distanceM(this.anchor, point) < RECORDER_RULES.curveSampleM) {
      return false;
    }
    const bearing = bearingDeg(this.anchor, point);
    this.anchor = point;
    if (this.prevBearing === null) {
      this.prevBearing = bearing;
      return false;
    }
    const turn = normalizeTurn(bearing - this.prevBearing);
    this.prevBearing = bearing;
    const straight = Math.abs(turn) < RECORDER_RULES.curveStraightDeg;
    const sameDirection = Math.sign(turn) === Math.sign(this.turn) || this.turn === 0;
    if (straight || !sameDirection) {
      // Straight again or turning the other way: a new bend may start.
      this.turn = straight ? 0 : turn;
      this.run = 0;
      this.counted = false;
      return false;
    }
    this.turn += turn;
    this.run += RECORDER_RULES.curveSampleM;
    if (this.run > RECORDER_RULES.curveWindowM) {
      // A long, gentle arc: keep only the recent turning.
      this.turn = turn;
      this.run = RECORDER_RULES.curveSampleM;
    }
    if (!this.counted && Math.abs(this.turn) >= RECORDER_RULES.curveMinTurnDeg) {
      this.counted = true;
      return true;
    }
    return false;
  }
}

/** Bends of a finished track (rides that come from navigation). */
export function countCurves(track: LngLat[][]) {
  const counter = new CurveCounter();
  let count = 0;
  for (const segment of track) {
    counter.breakTrack();
    for (const point of segment) {
      if (counter.add(point)) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Pure ride recorder: feed it location fixes and clock ticks, read totals. No timers or I/O, so
 * it runs the same on a device, in the simulator and in headless tests.
 */
export class RideRecorder {
  private phase: RecorderPhase = 'recording';
  private stats: RideStats;
  /** Segments as recorded, empty ones included (their indexes are the points' `segment`). */
  private segments: LngLat[][];
  /** Every point in order, for `pointsSince` (storage appends, the map's live tail). */
  private points: TrackPoint[] = [];
  private trackVersion = 0;
  private lastCountedAt: number;
  private lastFixAt: number | null = null;
  private lastGood: { coordinates: LngLat; timestamp: number } | null = null;
  private gps: GpsQuality = 'searching';
  private position: LngLat | null = null;
  private headingDeg: number | null = null;
  private standingSince: number | null = null;
  private breakCounted = false;
  private curves = new CurveCounter();
  private lean = new LeanEstimator();
  /** Calibrated motion-sensor lean (08.00); replaces the GPS estimate when present. */
  private sensorLean: SensorLeanTracker | null = null;
  private lastSpeedMps = 0;

  constructor(now: number, resume?: RecorderResumeState, options?: { sensorLean?: boolean }) {
    if (options?.sensorLean) {
      this.sensorLean = new SensorLeanTracker();
      // A restored ride keeps the extremes it already had.
      this.sensorLean.maxLeftDeg = resume?.stats.maxLeanLeftDeg ?? 0;
      this.sensorLean.maxRightDeg = resume?.stats.maxLeanRightDeg ?? 0;
    }
    this.stats = resume ? { ...resume.stats } : { ...EMPTY_RIDE_STATS };
    this.segments = resume ? resume.track.map((segment) => [...segment]) : [];
    this.segments.forEach((segment, index) =>
      segment.forEach((coordinates) =>
        this.points.push({ seq: this.points.length, segment: index, coordinates }),
      ),
    );
    this.lastCountedAt = now;
    // A restored recording waits for the rider's "Devam et".
    if (resume) {
      this.phase = 'paused';
    }
  }

  private get counting() {
    return this.phase === 'recording' && this.gps === 'good';
  }

  /** Adds the time since the last update to the totals while counting. */
  private advance(now: number) {
    const seconds = Math.max(0, (now - this.lastCountedAt) / 1000);
    this.lastCountedAt = now;
    if (!this.counting) {
      return;
    }
    this.stats.durationS += seconds;
    if (
      this.standingSince !== null &&
      (now - this.standingSince) / 1000 >= RECORDER_RULES.breakAfterS
    ) {
      this.stats.breakS += seconds;
    }
  }

  private startSegment() {
    this.segments.push([]);
    this.trackVersion += 1;
    this.lastGood = null;
    this.curves.breakTrack();
    this.lean.breakTrack();
    this.standingSince = null;
  }

  pause(now: number) {
    this.advance(now);
    this.phase = 'paused';
  }

  resume(now: number) {
    this.advance(now);
    this.phase = 'recording';
    this.startSegment();
  }

  /** Clock tick (about once a second): advances time and notices lost GPS. */
  tick(now: number) {
    this.advance(now);
    if (
      this.lastFixAt !== null &&
      now - this.lastFixAt >= RECORDER_RULES.lostAfterMs &&
      this.gps !== 'lost'
    ) {
      this.gps = 'lost';
    }
  }

  addFix(fix: LocationFix) {
    this.advance(fix.timestamp);
    this.lastFixAt = fix.timestamp;
    this.position = fix.coordinates;
    if (fix.headingDeg !== null) {
      this.headingDeg = fix.headingDeg;
    }

    const quality: GpsQuality = fix.accuracyM <= RECORDER_RULES.weakAccuracyM ? 'good' : 'weak';
    const regained = quality === 'good' && this.gps !== 'good' && this.gps !== 'searching';
    this.gps = quality;
    if (quality !== 'good' || this.phase !== 'recording') {
      return;
    }
    if (regained || this.segments.length === 0) {
      // Back from an automatic pause: the gap isn't drawn or counted.
      this.startSegment();
    }

    const last = this.lastGood;
    if (!last) {
      this.pushPoint(fix.coordinates);
      this.lastGood = { coordinates: fix.coordinates, timestamp: fix.timestamp };
      this.trackStanding(fix, 0);
      return;
    }

    const step = distanceM(last.coordinates, fix.coordinates);
    const seconds = Math.max((fix.timestamp - last.timestamp) / 1000, 0.001);
    const derivedSpeed = step / seconds;
    if (derivedSpeed > RECORDER_RULES.maxPlausibleSpeedMps) {
      return;
    }
    const speed = fix.speedMps ?? derivedSpeed;
    this.lastSpeedMps = speed;
    if (speed <= RECORDER_RULES.maxPlausibleSpeedMps) {
      this.stats.maxSpeedMps = Math.max(this.stats.maxSpeedMps, speed);
    }
    this.trackStanding(fix, speed);
    if (step < RECORDER_RULES.minStepM) {
      return;
    }
    this.stats.distanceM += step;
    this.pushPoint(fix.coordinates);
    this.lastGood = { coordinates: fix.coordinates, timestamp: fix.timestamp };
    if (this.curves.add(fix.coordinates)) {
      this.stats.curveCount += 1;
    }
    if (!this.sensorLean) {
      this.lean.add(fix.coordinates, fix.timestamp);
      this.stats.maxLeanLeftDeg = Math.max(this.stats.maxLeanLeftDeg ?? 0, this.lean.maxLeftDeg);
      this.stats.maxLeanRightDeg = Math.max(this.stats.maxLeanRightDeg ?? 0, this.lean.maxRightDeg);
    }
  }

  private pushPoint(coordinates: LngLat) {
    const segment = this.segments.length - 1;
    this.segments[segment].push(coordinates);
    this.points.push({ seq: this.points.length, segment, coordinates });
    this.trackVersion += 1;
  }

  /** A calibrated lean reading (degrees, right positive); counts only while riding. */
  addSensorLean(leanDeg: number) {
    if (!this.sensorLean || !this.counting) {
      return;
    }
    this.sensorLean.add(leanDeg, this.lastSpeedMps);
    this.stats.maxLeanLeftDeg = this.sensorLean.maxLeftDeg;
    this.stats.maxLeanRightDeg = this.sensorLean.maxRightDeg;
  }

  private trackStanding(fix: LocationFix, speed: number) {
    if (speed < RECORDER_RULES.standingSpeedMps) {
      this.standingSince ??= fix.timestamp;
      if (
        !this.breakCounted &&
        (fix.timestamp - this.standingSince) / 1000 >= RECORDER_RULES.breakAfterS
      ) {
        this.stats.breakCount += 1;
        // The standing time before the break was recognised belongs to it too.
        this.stats.breakS += RECORDER_RULES.breakAfterS;
        this.breakCounted = true;
      }
    } else {
      this.standingSince = null;
      this.breakCounted = false;
    }
  }

  snapshot(): RecorderSnapshot {
    const ridingS = Math.max(this.stats.durationS - this.stats.breakS, 0);
    return {
      phase: this.phase,
      autoPaused: this.phase === 'recording' && (this.gps === 'weak' || this.gps === 'lost'),
      gps: this.gps,
      stats: { ...this.stats },
      averageSpeedMps: ridingS > 0 ? this.stats.distanceM / ridingS : 0,
      position: this.position,
      headingDeg: this.headingDeg,
      trackVersion: this.trackVersion,
      pointCount: this.points.length,
    };
  }

  /** The whole track without empty segments, as a copy: for finishing or persisting it whole. */
  track(): LngLat[][] {
    return this.segments.filter((segment) => segment.length > 0).map((segment) => [...segment]);
  }

  /** Points from `seq` on (O(new points)): storage appends them, the map draws them as its tail. */
  pointsSince(seq: number): TrackPoint[] {
    return this.points.slice(Math.max(0, seq));
  }

  /** Index of the segment new points go into. */
  get currentSegment() {
    return this.segments.length - 1;
  }
}
