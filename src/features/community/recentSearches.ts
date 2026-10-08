import { useCallback, useState } from 'react';

import { deviceStore } from '@/lib/deviceStore';

import type { SearchResult } from './types';

const KEY = 'rolt.community.recentSearches';
/** Note `1005:39830`: at most 10, newest first. */
const LIMIT = 10;

/** A recent search: a typed query, or a rider / ride / place that was opened from the results. */
export type RecentSearch = { type: 'query'; query: string } | { type: 'result'; result: SearchResult };

const keyOf = (item: RecentSearch) =>
  item.type === 'query'
    ? `q:${item.query.toLocaleLowerCase()}`
    : `${item.result.kind}:${item.result.kind === 'ride' ? item.result.postId : item.result.id}`;

function read(): RecentSearch[] {
  try {
    const raw = deviceStore.getSync(KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

/** "Son aramalar" of the community search, kept on the device. */
export function useCommunityRecentSearches() {
  const [items, setItems] = useState<RecentSearch[]>(read);

  const save = useCallback((next: RecentSearch[]) => {
    setItems(next);
    deviceStore.set(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const add = useCallback(
    (item: RecentSearch) =>
      save([item, ...items.filter((existing) => keyOf(existing) !== keyOf(item))].slice(0, LIMIT)),
    [items, save],
  );
  const remove = useCallback(
    (item: RecentSearch) => save(items.filter((existing) => keyOf(existing) !== keyOf(item))),
    [items, save],
  );
  const clear = useCallback(() => save([]), [save]);

  return { items, add, remove, clear, keyOf };
}
