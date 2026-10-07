import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type SavedRoutesContextValue = {
  /** Saved route ids, most recently saved first ("Kaydettiklerim" order). */
  savedIds: readonly string[];
  isSaved: (routeId: string) => boolean;
  /** Returns the new saved state. */
  toggleSaved: (routeId: string) => boolean;
  setSaved: (routeId: string, saved: boolean) => void;
};

const SavedRoutesContext = createContext<SavedRoutesContextValue | null>(null);

/**
 * Bookmarked routes ("Kaydettiklerim"). In-memory until the backend exists; callers gate
 * saving behind `useRequireAccount('saveRoute', …)` so guests get the sign-in prompt.
 */
export function SavedRoutesProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<readonly string[]>([]);

  const setSaved = useCallback((routeId: string, saved: boolean) => {
    setSavedIds((current) => {
      const rest = current.filter((id) => id !== routeId);
      return saved ? [routeId, ...rest] : rest;
    });
  }, []);

  const isSaved = useCallback((routeId: string) => savedIds.includes(routeId), [savedIds]);

  const toggleSaved = useCallback(
    (routeId: string) => {
      const next = !savedIds.includes(routeId);
      setSaved(routeId, next);
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
