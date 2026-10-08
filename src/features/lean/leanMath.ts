/** Lean angle from the phone's motion sensors; written to CLAUDE.md's decision table. */
export const LEAN_SENSOR_RULES = {
  /** Sensor updates while measuring (50 ms = 20 Hz). */
  sampleMs: 50,
  /** Exponential smoothing of the shown angle (weight of the newest sample). */
  smoothing: 0.35,
  /** Within this of level the bike counts as upright (08.00 "Upright zone ±10°"). */
  uprightToleranceDeg: 10,
  /** Turning faster than this, or spreading more than `stableSpreadDeg` over `stableWindowMs`, is "Sallanıyor". */
  stableRateDegS: 8,
  stableSpreadDeg: 1.5,
  stableWindowMs: 1000,
  /** "3 saniye hareketsiz bekle". */
  calibrationMs: 3000,
  /** While riding, leans count only above this speed (not while walking the bike or stopped). */
  minRideSpeedMps: 3,
  /** Readings beyond this are a dropped phone, not riding. */
  maxDeg: 65,
} as const;

export type Vector3 = [number, number, number];

/**
 * Up direction in the phone's own axes (x right, y up the screen, z out of the screen) from the
 * device attitude (W3C / CoreMotion Euler angles in radians: beta about x, gamma about y). It is
 * the third row of Rz(α)·Rx(β)·Ry(γ), so the compass heading drops out.
 */
export function upFromRotation(beta: number, gamma: number): Vector3 {
  return [-Math.cos(beta) * Math.sin(gamma), Math.sin(beta), Math.cos(beta) * Math.cos(gamma)];
}

/**
 * Roll of the phone around the bike's length, in degrees, positive to the right: how far its x
 * axis dips below the horizon. A phone upright in a handlebar mount leans with the bike; the
 * mount's forward tilt (pitch) doesn't change it.
 */
export function rawLeanDeg([x, y, z]: Vector3) {
  return (Math.atan2(-x, Math.hypot(y, z)) * 180) / Math.PI;
}

/** Largest calibrated lean to each side while moving (09.06 "Sol / Sağ maks."). */
export class SensorLeanTracker {
  maxLeftDeg = 0;
  maxRightDeg = 0;

  add(leanDeg: number, speedMps: number) {
    if (speedMps < LEAN_SENSOR_RULES.minRideSpeedMps || Math.abs(leanDeg) > LEAN_SENSOR_RULES.maxDeg) {
      return;
    }
    if (leanDeg > 0) {
      this.maxRightDeg = Math.max(this.maxRightDeg, leanDeg);
    } else {
      this.maxLeftDeg = Math.max(this.maxLeftDeg, -leanDeg);
    }
  }
}
