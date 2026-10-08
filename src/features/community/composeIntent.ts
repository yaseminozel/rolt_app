/**
 * A post started elsewhere (09.01 "+" menu): "Gönderi yayınla" focuses the community composer,
 * "Fotoğraf ekle" brings the picked photos along. The composer takes it once.
 */
export type ComposeIntent = { photoUris: string[] };

let intent: ComposeIntent | null = null;
const listeners = new Set<() => void>();

export const composeIntent = {
  set(next: ComposeIntent) {
    intent = next;
    listeners.forEach((listener) => listener());
  },
  take() {
    const value = intent;
    intent = null;
    return value;
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
};
