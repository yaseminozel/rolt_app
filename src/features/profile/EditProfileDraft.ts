import { useSyncExternalStore } from 'react';

/**
 * The city picked in the 09.05 city sheet, handed back to the form (the sheet is its own
 * route). Cleared when the form opens.
 */
let pickedCity: string | null = null;
const listeners = new Set<() => void>();

export const editProfileCity = {
  set(city: string | null) {
    pickedCity = city;
    listeners.forEach((listener) => listener());
  },
  get: () => pickedCity,
};

export function usePickedCity() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pickedCity,
  );
}
