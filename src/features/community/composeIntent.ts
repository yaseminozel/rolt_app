import type { PostRide } from './types';

/**
 * A post started elsewhere: the 09.01 "+" menu ("Gönderi yayınla" focuses the community
 * composer, "Fotoğraf ekle" brings the picked photos along) or "Toplulukta paylaş" on a ride
 * (08.11, 09.03, 09.06 options), which attaches the ride. The composer takes it once.
 */
export type ComposeIntent = {
  photoUris: string[];
  /** The ride card as the post will show it, and the ride's id once it is on the server. */
  ride?: { snapshot: PostRide; rideId?: string };
};

let intent: ComposeIntent | null = null;
const listeners = new Set<() => void>();
const watchers = new Set<() => void>();

export const composeIntent = {
  set(next: ComposeIntent) {
    intent = next;
    watchers.forEach((watcher) => watcher());
    listeners.forEach((listener) => listener());
  },
  take() {
    const value = intent;
    intent = null;
    return value;
  },
  /** Whether an intent waits for the composer (the empty feed hides it until one arrives). */
  isPending() {
    return intent !== null;
  },
  /** Calls `onIntent` with each new intent (already taken). */
  subscribe(onIntent: (value: ComposeIntent) => void) {
    const listener = () => {
      const value = composeIntent.take();
      if (value) {
        onIntent(value);
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Calls `onSet` whenever an intent is set, without taking it (the screen around the composer). */
  watch(onSet: () => void) {
    watchers.add(onSet);
    return () => {
      watchers.delete(onSet);
    };
  },
};
