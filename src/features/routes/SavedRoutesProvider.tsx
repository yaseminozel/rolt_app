import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { routesRepository } from './queries';

type SavedRoutesContextValue = {
  /** Saved route ids, most recently saved first ("Kaydettiklerim" order). */
  savedIds: readonly string[];
  isSaved: (routeId: string) => boolean;
  /** Returns the new saved state. */
  toggleSaved: (routeId: string) => boolean;
  /**
   * Updates the list at once and stores the change for the signed-in rider. Resolves `false`
   * when storing failed and the change was rolled back (callers show the failure toast).
   */
  setSaved: (routeId: string, saved: boolean) => Promise<boolean>;
};

const SavedRoutesContext = createContext<SavedRoutesContextValue | null>(null);

function withSaved(ids: readonly string[], routeId: string, saved: boolean) {
  const rest = ids.filter((id) => id !== routeId);
  return saved ? [routeId, ...rest] : rest;
}

/**
 * Bookmarked routes ("Kaydettiklerim"). The rider's list is loaded when a session starts and
 * cleared when it ends; changes show at once and are stored in the background (rolled back if
 * that fails). Callers gate saving behind `useRequireAccount('saveRoute', …)` so guests get the
 * sign-in prompt; without a session changes stay on the device.
 */
export function SavedRoutesProvider({ children }: { children: ReactNode }) {
  const userId = useAuth().session?.userId ?? null;
  const [savedIds, setSavedIds] = useState<readonly string[]>([]);
  const savedIdsRef = useRef(savedIds);
  const userRef = useRef(userId);
  /**
   * Changes made for this account, replayed over a list that finishes loading after them (e.g.
   * a guest's bookmark completed right after signing in, while the list was still loading).
   */
  const writes = useRef(new Map<string, boolean>());
  /** Latest write per route: a failing earlier write must not roll back a newer one. */
  const writeSequence = useRef(new Map<string, number>());
  /** Writes of one route run in order (save → undo must not reach the server reversed). */
  const queues = useRef(new Map<string, Promise<unknown>>());

  const update = useCallback((next: (ids: readonly string[]) => readonly string[]) => {
    savedIdsRef.current = next(savedIdsRef.current);
    setSavedIds(savedIdsRef.current);
  }, []);

  useEffect(() => {
    const previous = userRef.current;
    userRef.current = userId;
    if (previous !== null && previous !== userId) {
      // Signed out or switched accounts: the old rider's bookmarks go.
      writes.current.clear();
      update(() => []);
    }
    if (!userId) {
      return;
    }
    let active = true;
    routesRepository
      .listSavedIds()
      .then((ids) => {
        if (active) {
          update(() => {
            let next: readonly string[] = ids;
            writes.current.forEach((saved, routeId) => {
              next = withSaved(next, routeId, saved);
            });
            return next;
          });
        }
      })
      // Offline at sign-in: keep what is on screen; the next session start loads again.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [update, userId]);

  const setSaved = useCallback(
    async (routeId: string, saved: boolean) => {
      const owner = userRef.current;
      const wasSaved = savedIdsRef.current.includes(routeId);
      update((ids) => withSaved(ids, routeId, saved));
      if (!owner) {
        return true;
      }
      writes.current.set(routeId, saved);
      const sequence = (writeSequence.current.get(routeId) ?? 0) + 1;
      writeSequence.current.set(routeId, sequence);
      const write = (queues.current.get(routeId) ?? Promise.resolve())
        .catch(() => undefined)
        .then(() => routesRepository.setSaved(routeId, saved));
      queues.current.set(routeId, write);
      try {
        await write;
        return true;
      } catch {
        const isLatest = writeSequence.current.get(routeId) === sequence;
        if (userRef.current !== owner || !isLatest) {
          return true;
        }
        writes.current.set(routeId, wasSaved);
        update((ids) => withSaved(ids, routeId, wasSaved));
        return false;
      } finally {
        if (queues.current.get(routeId) === write) {
          queues.current.delete(routeId);
        }
      }
    },
    [update],
  );

  const isSaved = useCallback((routeId: string) => savedIds.includes(routeId), [savedIds]);

  const toggleSaved = useCallback(
    (routeId: string) => {
      const next = !savedIds.includes(routeId);
      void setSaved(routeId, next);
      return next;
    },
    [savedIds, setSaved],
  );

  const value = useMemo(
    () => ({ savedIds, isSaved, toggleSaved, setSaved }),
    [isSaved, savedIds, setSaved, toggleSaved],
  );

  return <SavedRoutesContext.Provider value={value}>{children}</SavedRoutesContext.Provider>;
}

export function useSavedRoutes() {
  const context = useContext(SavedRoutesContext);
  if (!context) {
    throw new Error('useSavedRoutes must be used inside SavedRoutesProvider');
  }
  return context;
}
