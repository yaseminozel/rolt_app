/**
 * Development log of the lean angle's side, to check on a phone that leaning right reads as
 * right (CLAUDE.md "İşaret (sol/sağ) cihazda doğrulanmalı"). Expo Go has the motion sensors, so
 * tilting the phone on 08.00 Kalibrasyon or during a calibrated ride prints e.g.
 * `[lean:calibration] RIGHT 12.4° (raw 13.1°, zero 0.7°)` in the Metro terminal once a second.
 * Silent in release builds.
 */
export type LeanLogSource = 'calibration' | 'recording' | 'navigation';

const LOG_INTERVAL_MS = 1_000;
/** Below this the phone counts as upright; no side is printed. */
const UPRIGHT_DEG = 1;

export function createLeanLogger(source: LeanLogSource) {
  let lastAt = 0;
  return (leanDeg: number, rawDeg: number, zeroDeg: number) => {
    if (!__DEV__) {
      return;
    }
    const now = Date.now();
    if (now - lastAt < LOG_INTERVAL_MS) {
      return;
    }
    lastAt = now;
    const side = Math.abs(leanDeg) < UPRIGHT_DEG ? 'UPRIGHT' : leanDeg > 0 ? 'RIGHT' : 'LEFT';
    console.log(
      `[lean:${source}] ${side} ${Math.abs(leanDeg).toFixed(1)}° (raw ${rawDeg.toFixed(1)}°, zero ${zeroDeg.toFixed(1)}°)`,
    );
  };
}
