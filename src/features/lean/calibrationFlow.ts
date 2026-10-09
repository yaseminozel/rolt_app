import { useSyncExternalStore } from 'react';

/**
 * One-shot hand-off from 08.00 Kalibrasyon back to the Record tab: the start the rider asked
 * for goes ahead once calibration is done or skipped (flow B keeps the start intent).
 */
let pendingStart = false;
const listeners = new Set<() => void>();

export const calibrationFlow = {
  requestStart() {
    pendingStart = true;
    listeners.forEach((listener) => listener());
  },
  /** Returns and clears the pending start. */
  takeStart() {
    const value = pendingStart;
    pendingStart = false;
    return value;
  },
};

export function usePendingCalibrationStart() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pendingStart,
  );
}
