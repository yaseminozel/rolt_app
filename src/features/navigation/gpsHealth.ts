import type { LocationFix } from './types';

/**
 * When GPS counts as weak or lost (CLAUDE.md "Kayıt" / "Navigasyon"). Shared by the ride recorder
 * and navigation so both show the same state.
 *
 * Standing at a light is not a GPS problem: phones send fewer (or no) fixes while nothing moves and
 * accuracy may wobble for a moment. So:
 * - one inaccurate fix never flips the state; inaccuracy must last `weakConfirm*Ms` without a
 *   single accurate fix in between (longer while standing);
 * - silence means "lost" only after `lostAfterMovingMs` when the last fixes were moving, and only
 *   after `lostAfterStandingMs` when the rider had stopped.
 */
export const GPS_HEALTH_RULES = {
  /** Fixes less accurate than this are not used and, if they last, show "GPS zayıf". */
  weakAccuracyM: 50,
  weakConfirmMovingMs: 5_000,
  weakConfirmStandingMs: 20_000,
  lostAfterMovingMs: 30_000,
  lostAfterStandingMs: 120_000,
  /** Below this speed the rider counts as standing. */
  standingSpeedMps: 1,
  /** The shown speed drops to 0 when the last speed reading is older than this. */
  speedStaleMs: 4_000,
} as const;

export type GpsHealthState = 'good' | 'weak' | 'lost';

/** Wall-clock time a fix arrived (silence is measured on the same clock as the ticks). */
export const fixArrival = (fix: LocationFix) => fix.receivedAt ?? fix.timestamp;

export class GpsHealth {
  private lastFixAt: number | null;
  private badSince: number | null = null;
  private moving = false;
  private current: GpsHealthState = 'good';
  private speedMps = 0;
  private speedAt: number | null = null;

  /** `startedAt`: count silence from then even before the first fix (navigation start). */
  constructor(startedAt?: number) {
    this.lastFixAt = startedAt ?? null;
  }

  get state() {
    return this.current;
  }

  /** Records a fix; true when it is accurate enough to use. */
  addFix(fix: LocationFix, at: number): boolean {
    this.lastFixAt = at;
    if (fix.accuracyM <= GPS_HEALTH_RULES.weakAccuracyM) {
      this.badSince = null;
      this.current = 'good';
      if (fix.speedMps !== null) {
        this.setSpeed(fix.speedMps, at);
      }
      return true;
    }
    this.badSince ??= at;
    this.evaluate(at);
    return false;
  }

  /** Speed of the latest usable movement (GPS or derived from two fixes). */
  setSpeed(speedMps: number, at: number) {
    // GPS speed reads a little above zero while standing; smooth out single readings.
    this.speedMps = this.speedAt === null ? speedMps : this.speedMps * 0.4 + speedMps * 0.6;
    this.speedAt = at;
    this.moving = speedMps >= GPS_HEALTH_RULES.standingSpeedMps;
  }

  /** Current speed to show: 0 while standing, without recent readings or without good GPS. */
  shownSpeedMps(now: number) {
    if (
      this.current !== 'good' ||
      this.speedAt === null ||
      now - this.speedAt > GPS_HEALTH_RULES.speedStaleMs ||
      this.speedMps < GPS_HEALTH_RULES.standingSpeedMps
    ) {
      return 0;
    }
    return this.speedMps;
  }

  /** Re-evaluates the state at `now` (clock ticks notice silence). */
  evaluate(now: number): GpsHealthState {
    if (this.lastFixAt === null) {
      return this.current;
    }
    const silence = now - this.lastFixAt;
    const lostAfter = this.moving ? GPS_HEALTH_RULES.lostAfterMovingMs : GPS_HEALTH_RULES.lostAfterStandingMs;
    if (silence >= lostAfter) {
      this.current = 'lost';
    } else if (this.badSince !== null) {
      const confirm = this.moving ? GPS_HEALTH_RULES.weakConfirmMovingMs : GPS_HEALTH_RULES.weakConfirmStandingMs;
      // Weak only after lasting inaccuracy; once weak or lost, inaccurate fixes keep it there.
      if (this.current !== 'good' || now - this.badSince >= confirm) {
        this.current = 'weak';
      }
    } else if (this.current === 'lost') {
      this.current = 'good';
    }
    return this.current;
  }

  /** Starts silence over (e.g. "Devam et" after a manual pause with slow, coarse fixes). */
  restart(now: number) {
    if (this.lastFixAt !== null) {
      this.lastFixAt = now;
    }
    this.badSince = null;
    if (this.current !== 'weak') {
      this.current = 'good';
    }
  }

  /** Read-only inner state for the developer GPS panel; doesn't re-evaluate. */
  diagnostics(now: number): GpsHealthDiagnostics {
    const confirmMs = this.moving
      ? GPS_HEALTH_RULES.weakConfirmMovingMs
      : GPS_HEALTH_RULES.weakConfirmStandingMs;
    return {
      state: this.current,
      lastFixAt: this.lastFixAt,
      badSince: this.badSince,
      moving: this.moving,
      speedMps: this.speedMps,
      weakInMs:
        this.current === 'good' && this.badSince !== null
          ? Math.max(0, confirmMs - (now - this.badSince))
          : null,
    };
  }
}

export type GpsHealthDiagnostics = {
  state: GpsHealthState;
  lastFixAt: number | null;
  /** Start of the current run of inaccurate fixes. */
  badSince: number | null;
  /** The last speed reading was at or above `standingSpeedMps`. */
  moving: boolean;
  /** Smoothed speed of the last usable movement. */
  speedMps: number;
  /** Inaccurate but not weak yet: how long until it turns weak. */
  weakInMs: number | null;
};
