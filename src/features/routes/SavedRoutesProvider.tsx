import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type SavedRoutesContextValue = {
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
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());

  const setSaved = useCallback((routeId: string, saved: boolean) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (saved) {
        next.add(routeId);
      } else {
        next.delete(routeId);
      }
      return next;
    });
  }, []);

  const isSaved = useCallback((routeId: string) => savedIds.has(routeId), [savedIds]);

  const toggleSaved = useCallback(
    (routeId: string) => {
      const next = !savedIds.has(routeId);
      setSaved(routeId, next);
      return next;
    },
    [savedIds, setSaved],
  );

  const value = useMemo(() => ({ isSaved, toggleSaved, setSaved }), [isSaved, toggleSaved, setSaved]);

  return <SavedRoutesContext.Provider value={value}>{children}</SavedRoutesContext.Provider>;
}

export function useSavedRoutes() {
  const context = useContext(SavedRoutesContext);
  if (!context) {
    throw new Error('useSavedRoutes must be used inside SavedRoutesProvider');
  }
  return context;
}
