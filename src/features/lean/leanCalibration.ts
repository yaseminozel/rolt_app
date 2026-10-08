import { useSyncExternalStore } from 'react';

import { deviceStore } from '@/lib/deviceStore';

const KEY = 'rolt.lean.calibration';
const SKIPPED_KEY = 'rolt.lean.calibrationSkipped';

/** The phone's roll in its mount with the bike upright, subtracted from every reading. */
export type LeanCalibration = { offsetDeg: number; calibratedAt: number };

function read(): LeanCalibration | null {
  try {
    const raw = deviceStore.getSync(KEY);
    return raw ? (JSON.parse(raw) as LeanCalibration) : null;
  } catch {
    return null;
  }
}

let current = read();
const listeners = new Set<() => void>();

/** 08.00 Kalibrasyon: the zero point for this phone position, kept on the device. */
export const leanCalibration = {
  get: () => current,
  save(offsetDeg: number) {
    current = { offsetDeg, calibratedAt: Date.now() };
    deviceStore.set(KEY, JSON.stringify(current)).catch(() => undefined);
    listeners.forEach((listener) => listener());
  },
  /** "Atla": the record start doesn't ask again (Ayarlar › Sensörler still can). */
  markSkipped: () => deviceStore.set(SKIPPED_KEY, 'true').catch(() => undefined),
  wasSkipped: () => {
    try {
      return deviceStore.getSync(SKIPPED_KEY) === 'true';
    } catch {
      return false;
    }
  },
};

export function useLeanCalibration() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
