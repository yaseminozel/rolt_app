import type { Place, RouteSuggestionDraft } from './types';

/**
 * Saved route-suggestion drafts ("Profil › Taslaklar") and recently used places
 * ("SON KULLANILANLAR"). In memory until the backend / local database exists.
 */
export type SavedDraft = { id: string; savedAt: string; draft: RouteSuggestionDraft };

const drafts = new Map<string, SavedDraft>();
let recentPlaces: Place[] = [];
const MAX_RECENT_PLACES = 5;

export function saveDraft(draft: RouteSuggestionDraft, id?: string): SavedDraft {
  const saved: SavedDraft = {
    id: id ?? `draft-${Date.now().toString(36)}`,
    savedAt: new Date().toISOString(),
    draft,
  };
  drafts.set(saved.id, saved);
  return saved;
}

export const getDraft = (id: string) => drafts.get(id) ?? null;
export const listDrafts = () => [...drafts.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
export const deleteDraft = (id: string) => drafts.delete(id);

export function rememberPlace(place: Place) {
  recentPlaces = [place, ...recentPlaces.filter((item) => item.id !== place.id)].slice(0, MAX_RECENT_PLACES);
}

export const getRecentPlaces = () => recentPlaces;
