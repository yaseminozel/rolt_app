import { haptics } from '@/features/haptics/haptics';

/**
 * Touch feedback for 08.00 Kalibrasyon, so the rider can level the bike without staring at
 * the dial: a light tick every 5° like a detent, a firm tap when the reading turns green
 * (upright and still), a warning buzz when it tips past ±10°, a tap per countdown second, and
 * success / error when the zero point is saved or the measurement is cancelled.
 */
export const CALIBRATION_HAPTIC_RULES = {
  /** One detent tick per this many degrees of lean. */
  tickStepDeg: 5,
  /** A tick needs the reading this far past the detent, so noise on the line stays quiet. */
  tickHysteresisDeg: 0.6,
  /** Ticks closer together than this are dropped (a fast swing would otherwise buzz). */
  tickMinGapMs: 60,
  /** A posture must hold this long before it is announced (no buzz on a flicker at ±10°). */
  postureHoldMs: 250,
} as const;

export type CalibrationPosture = 'upright' | 'tilted' | 'shaking';

const play = {
  tick: haptics.select,
  upright: haptics.press,
  tilted: haptics.warning,
  countdown: haptics.tap,
  saved: haptics.success,
  cancelled: haptics.error,
};

/** Per-screen haptic state; feed it every rendered reading. */
export function createCalibrationHaptics() {
  let bucket: number | null = null;
  let lastTickAt = 0;
  let announced: CalibrationPosture | null = null;
  let candidate: CalibrationPosture | null = null;
  let candidateSince = 0;

  return {
    /** A live reading: detent ticks, and posture changes once they hold. */
    reading(leanDeg: number, posture: CalibrationPosture | null, now: number) {
      let postureFired = false;
      if (posture !== null) {
        if (posture !== candidate) {
          candidate = posture;
          candidateSince = now;
        }
        if (candidate !== announced && now - candidateSince >= CALIBRATION_HAPTIC_RULES.postureHoldMs) {
          // The first posture on opening is the starting point, not a change.
          if (announced !== null) {
            if (candidate === 'upright') {
              play.upright();
              postureFired = true;
            } else if (candidate === 'tilted') {
              play.tilted();
              postureFired = true;
            }
          }
          announced = candidate;
        }
      }

      const { tickStepDeg, tickHysteresisDeg, tickMinGapMs } = CALIBRATION_HAPTIC_RULES;
      const magnitude = Math.abs(leanDeg);
      const next = Math.floor(magnitude / tickStepDeg);
      if (bucket === null) {
        bucket = next;
        return;
      }
      const crossed =
        (next > bucket && magnitude >= next * tickStepDeg + tickHysteresisDeg) ||
        (next < bucket && magnitude <= bucket * tickStepDeg - tickHysteresisDeg);
      if (crossed) {
        bucket = next;
        if (!postureFired && now - lastTickAt >= tickMinGapMs) {
          lastTickAt = now;
          play.tick();
        }
      }
    },
    /** A countdown second went by while measuring. */
    countdown: play.countdown,
    saved: play.saved,
    /** Moving or tilting cancelled the measurement; the posture it fell into is not re-announced. */
    cancelled(posture: CalibrationPosture) {
      play.cancelled();
      announced = posture;
      candidate = posture;
    },
    /** Measuring or done: the detents restart from wherever the dial is next. */
    resetTicks() {
      bucket = null;
    },
  };
}
