import { bearingDeg, distanceM } from '@/features/navigation/geometry';
import type { LocationFix } from '@/features/navigation/types';
import type { LngLat } from '@/features/routes/types';

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
  track: LngLat[][];
};

/** What a recording restored after a crash continues from (08.03). */
export type RecorderResumeState = {
  stats: RideStats;
  track: LngLat[][];
};

const normalizeTurn = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Pure ride recorder: feed it location fixes and clock ticks, read totals. No timers or I/O, so
 * it runs the same on a device, in the simulator and in headless tests.
 */
export class RideRecorder {
  private phase: RecorderPhase = 'recording';
  private stats: RideStats;
  private track: LngLat[][];
  private lastCountedAt: number;
  private lastFixAt: number | null = null;
  private lastGood: { coordinates: LngLat; timestamp: number } | null = null;
  private gps: GpsQuality = 'searching';
  private position: LngLat | null = null;
  private headingDeg: number | null = null;
  private standingSince: number | null = null;
  private breakCounted = false;
  // Bend detection on resampled points.
  private curveAnchor: LngLat | null = null;
  private curvePrevBearing: number | null = null;
  private curveTurn = 0;
  private curveRun = 0;
  private curveCounted = false;

  constructor(now: number, resume?: RecorderResumeState) {
    this.stats = resume ? { ...resume.stats } : { ...EMPTY_RIDE_STATS };
    this.track = resume ? resume.track.map((segment) => [...segment]) : [];
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
    this.track.push([]);
    this.lastGood = null;
    this.curveAnchor = null;
    this.curvePrevBearing = null;
    this.curveTurn = 0;
    this.curveRun = 0;
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
    if (regained || this.track.length === 0) {
      // Back from an automatic pause: the gap isn't drawn or counted.
      this.startSegment();
    }

    const segment = this.track[this.track.length - 1];
    const last = this.lastGood;
    if (!last) {
      segment.push(fix.coordinates);
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
    if (speed <= RECORDER_RULES.maxPlausibleSpeedMps) {
      this.stats.maxSpeedMps = Math.max(this.stats.maxSpeedMps, speed);
    }
    this.trackStanding(fix, speed);
    if (step < RECORDER_RULES.minStepM) {
      return;
    }
    this.stats.distanceM += step;
    segment.push(fix.coordinates);
    this.lastGood = { coordinates: fix.coordinates, timestamp: fix.timestamp };
    this.measureCurve(fix.coordinates);
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

  private measureCurve(point: LngLat) {
    if (!this.curveAnchor) {
      this.curveAnchor = point;
      return;
    }
    if (distanceM(this.curveAnchor, point) < RECORDER_RULES.curveSampleM) {
      return;
    }
    const bearing = bearingDeg(this.curveAnchor, point);
    this.curveAnchor = point;
    if (this.curvePrevBearing === null) {
      this.curvePrevBearing = bearing;
      return;
    }
    const turn = normalizeTurn(bearing - this.curvePrevBearing);
    this.curvePrevBearing = bearing;
    const sameDirection = Math.sign(turn) === Math.sign(this.curveTurn) || this.curveTurn === 0;
    if (Math.abs(turn) < RECORDER_RULES.curveStraightDeg || !sameDirection) {
      // Straight again or turning the other way: a new bend may start.
      this.curveTurn = Math.abs(turn) < RECORDER_RULES.curveStraightDeg ? 0 : turn;
      this.curveRun = 0;
      this.curveCounted = false;
      return;
    }
    this.curveTurn += turn;
    this.curveRun += RECORDER_RULES.curveSampleM;
    if (this.curveRun > RECORDER_RULES.curveWindowM) {
      // A long, gentle arc: keep only the recent turning.
      this.curveTurn = turn;
      this.curveRun = RECORDER_RULES.curveSampleM;
    }
    if (!this.curveCounted && Math.abs(this.curveTurn) >= RECORDER_RULES.curveMinTurnDeg) {
      this.stats.curveCount += 1;
      this.curveCounted = true;
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
      track: this.track.filter((segment) => segment.length > 0).map((segment) => [...segment]),
    };
  }
}
