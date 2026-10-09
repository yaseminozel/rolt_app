import type { LngLat } from '@/features/routes/types';

import { distanceM } from './geometry';
import { fixArrival, GPS_HEALTH_RULES } from './gpsHealth';
import type { LocationFix, LocationPowerMode } from './types';

/**
 * When the GPS may slow down because the bike stands still (CLAUDE.md "GPS profili"). Fixes come
 * every second without a distance filter while riding, so a long stop would keep the GPS at full
 * power for nothing; after `standingAfterMs` of standing the location source drops to its
 * `standing` options and goes back to `active` on the first fix that moves.
 */
export const STANDING_POWER_RULES = {
  standingAfterMs: 90_000,
  /** A fix at least this fast is moving. */
  movingSpeedMps: GPS_HEALTH_RULES.standingSpeedMps,
  /** An accurate fix this far from where the bike stopped is moving (phones without GPS speed). */
  movingStepM: 15,
} as const;

/**
 * Tells standing from moving. Inaccurate fixes don't start or end a stand (their position
 * wanders), except that any fix reporting a moving speed ends it: waking the GPS is the safe side.
 */
export class StandingDetector {
  private standingSince: number | null = null;
  /** Where the bike stopped; drift around it isn't movement. */
  private anchor: LngLat | null = null;

  addFix(fix: LocationFix) {
    const at = fixArrival(fix);
    const fast = fix.speedMps !== null && fix.speedMps >= STANDING_POWER_RULES.movingSpeedMps;
    const usable = fix.accuracyM <= GPS_HEALTH_RULES.weakAccuracyM;
    const stepped =
      usable &&
      this.anchor !== null &&
      distanceM(this.anchor, fix.coordinates) >= STANDING_POWER_RULES.movingStepM;
    if (fast || stepped) {
      this.standingSince = null;
      this.anchor = null;
      return;
    }
    if (usable) {
      this.standingSince ??= at;
      this.anchor ??= fix.coordinates;
    }
  }

  /** Standing long enough at `now` to slow the GPS down. */
  isStanding(now: number) {
    return (
      this.standingSince !== null &&
      now - this.standingSince >= STANDING_POWER_RULES.standingAfterMs
    );
  }

  reset() {
    this.standingSince = null;
    this.anchor = null;
  }
}

/**
 * Picks the location source's power mode for a recording or a navigation and applies it only when
 * it changes. A manual pause (`idle`) wins over everything; `standing` needs good GPS (weak or
 * lost GPS keeps full power, so it recovers as fast as it can).
 */
export class LocationPowerController {
  private readonly detector = new StandingDetector();
  private paused = false;
  private gpsGood = false;
  private applied: LocationPowerMode = 'active';
  private readonly apply: (mode: LocationPowerMode) => void;

  constructor(apply: (mode: LocationPowerMode) => void) {
    this.apply = apply;
  }

  get mode() {
    return this.applied;
  }

  /** Paused by hand (`idle`) or resumed; standing is measured from scratch after either. */
  setPaused(paused: boolean, now: number) {
    this.paused = paused;
    this.detector.reset();
    this.update(now);
  }

  /** `gpsGood`: the recorder's / tracker's GPS state after this fix. */
  addFix(fix: LocationFix, gpsGood: boolean) {
    this.gpsGood = gpsGood;
    this.detector.addFix(fix);
    this.update(fixArrival(fix));
  }

  tick(now: number, gpsGood: boolean) {
    this.gpsGood = gpsGood;
    this.update(now);
  }

  private update(now: number) {
    const next: LocationPowerMode = this.paused
      ? 'idle'
      : this.gpsGood && this.detector.isStanding(now)
        ? 'standing'
        : 'active';
    if (next !== this.applied) {
      this.applied = next;
      this.apply(next);
    }
  }
}
