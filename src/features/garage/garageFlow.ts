import { useSyncExternalStore } from 'react';

/**
 * One-shot result of the 11.02–11.05 add sheet for the Motorum page underneath: which toast to
 * show once the sheet has closed ("Motorun eklendi." / "Motorun güncellendi.", or the failure toast:
 * the sheet covers toasts on iOS).
 */
type GarageResult = 'added' | 'changed' | 'failed' | null;

let result: GarageResult = null;
const listeners = new Set<() => void>();

export const garageResult = {
  set(next: GarageResult) {
    result = next;
    listeners.forEach((listener) => listener());
  },
};

export function useGarageResult() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => result,
  );
}
