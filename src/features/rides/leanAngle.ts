import { bearingDeg, distanceM } from '@/features/navigation/geometry';
import type { LngLat } from '@/features/routes/types';

/** Lean angle estimate from GPS; written to CLAUDE.md's decision table. */
export const LEAN_RULES = {
  /** Heading is measured over points at least this far apart (GPS heading jitters below it). */
  sampleM: 15,
  /** Below this speed a turn isn't a lean (walking the bike, parking). */
  minSpeedMps: 5,
  /** Estimates above this are GPS noise, not riding. */
  maxDeg: 60,
} as const;

const GRAVITY = 9.81;
const normalizeTurn = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Maximum lean to each side ("Yatış açısı", 09.06 `1083:18468`), estimated without motion
 * sensors: a bike turning at rate ω with speed v leans atan(v·ω / g). Positive turns (clockwise
 * heading) are right-hand bends.
 */
export class LeanEstimator {
  private anchor: { point: LngLat; timestamp: number } | null = null;
  private prev: { bearing: number; timestamp: number } | null = null;
  maxLeftDeg = 0;
  maxRightDeg = 0;

  /** A gap in the track (pause, GPS loss): don't measure across it. */
  breakTrack() {
    this.anchor = null;
    this.prev = null;
  }

  add(point: LngLat, timestamp: number) {
    if (!this.anchor) {
      this.anchor = { point, timestamp };
      return;
    }
    const step = distanceM(this.anchor.point, point);
    if (step < LEAN_RULES.sampleM) {
      return;
    }
    const seconds = (timestamp - this.anchor.timestamp) / 1000;
    const bearing = bearingDeg(this.anchor.point, point);
    this.anchor = { point, timestamp };
    const previous = this.prev;
    this.prev = { bearing, timestamp };
    if (!previous || seconds <= 0) {
      return;
    }
    const speed = step / seconds;
    const turnSeconds = (timestamp - previous.timestamp) / 1000;
    if (speed < LEAN_RULES.minSpeedMps || turnSeconds <= 0) {
      return;
    }
    const turnRate = (normalizeTurn(bearing - previous.bearing) * Math.PI) / 180 / turnSeconds;
    const lean = (Math.atan((speed * Math.abs(turnRate)) / GRAVITY) * 180) / Math.PI;
    if (lean > LEAN_RULES.maxDeg) {
      return;
    }
    if (turnRate > 0) {
      this.maxRightDeg = Math.max(this.maxRightDeg, lean);
    } else {
      this.maxLeftDeg = Math.max(this.maxLeftDeg, lean);
    }
  }
}
