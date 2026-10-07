import { useSyncExternalStore } from 'react';

import { normalizeForSearch } from '@/lib/searchText';

/** "SON ARAMALAR" keeps at most five queries (note `mUNKb`), most recent first, in memory. */
const MAX_RECENT = 5;

let recent: readonly string[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function addRecentStopSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }
  const key = normalizeForSearch(trimmed);
  recent = [trimmed, ...recent.filter((item) => normalizeForSearch(item) !== key)].slice(0, MAX_RECENT);
  notify();
}

export function removeRecentStopSearch(query: string) {
  recent = recent.filter((item) => item !== query);
  notify();
}

export function clearRecentStopSearches() {
  recent = [];
  notify();
}

export function useRecentStopSearches() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => recent,
  );
}
