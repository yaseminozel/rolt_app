import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { LngLat } from '@/features/routes/types';

import { deleteDraft, rememberPlace, saveDraft } from './draftStore';
import { routing } from './services';
import { uploadRoutePhoto } from './services/mockPhotoUploader';
import type { NoRouteError } from './services/types';
import {
  MAX_STOPS,
  MAX_SUGGESTION_PHOTOS,
  type Place,
  type RoutePreview,
  type RouteSuggestionDraft,
  type SubmissionResult,
  type Waypoint,
} from './types';

export type RouteCalculation =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; error: NoRouteError | Error };

type RouteSuggestionContextValue = {
  draft: RouteSuggestionDraft;
  /** Id of the saved draft being edited, if the flow was opened from / saved as a draft. */
  draftId: string | null;
  routeCalculation: RouteCalculation;
  /** Start and end are set and the line is calculated: "Devam et" on 04.1 can proceed. */
  canContinueFromLocation: boolean;
  lastResult: SubmissionResult | null;

  setWaypointPlace: (waypointId: string, place: Place | null) => void;
  addStop: () => void;
  removeStop: (waypointId: string) => void;
  /** Reorders stops only; start and end stay first and last. */
  moveStop: (fromIndex: number, toIndex: number) => void;
  /** "⇅" on the start row: swaps start and end. */
  swapEnds: () => void;
  /** Applies a route edited on the map (04.1 "Haritada düzenle"). */
  applyEditedRoute: (waypoints: Waypoint[], preview: RoutePreview) => void;
  recalculate: () => void;

  updateDetails: (changes: Partial<Pick<RouteSuggestionDraft, 'name' | 'tags' | 'difficulty' | 'description'>>) => void;
  addPhotos: (uris: string[]) => void;
  retryPhoto: (photoId: string) => void;
  removePhoto: (photoId: string) => void;
  setCoverPhoto: (photoId: string) => void;

  /** "Taslağı kaydet ve çık" / failed sending: keeps the draft on the device. */
  saveAsDraft: () => void;
  setLastResult: (result: SubmissionResult | null) => void;
  /** "Başka rota öner": starts over with an empty draft. */
  reset: () => void;
};

const RouteSuggestionContext = createContext<RouteSuggestionContextValue | null>(null);

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;

function emptyDraft(): RouteSuggestionDraft {
  return {
    waypoints: [
      { id: newId('wp'), kind: 'start', place: null },
      { id: newId('wp'), kind: 'end', place: null },
    ],
    preview: null,
    name: '',
    tags: [],
    difficulty: null,
    description: '',
    photos: [],
  };
}

const RECALCULATE_DELAY_MS = 400;

/** Waypoints that have a place, in order — the coordinates sent to routing. */
const routableCoordinates = (waypoints: Waypoint[]): LngLat[] =>
  waypoints.filter((waypoint) => waypoint.place).map((waypoint) => waypoint.place!.coordinates);

/** State of one "Rota öner" flow (04.1–04.6); mounted by `src/app/suggest-route/_layout.tsx`. */
export function RouteSuggestionProvider({ children, initialDraft }: { children: ReactNode; initialDraft?: { id: string; draft: RouteSuggestionDraft } }) {
  const [draft, setDraft] = useState<RouteSuggestionDraft>(() => initialDraft?.draft ?? emptyDraft());
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [routeCalculation, setRouteCalculation] = useState<RouteCalculation>({ status: 'idle' });
  const [lastResult, setLastResult] = useState<SubmissionResult | null>(null);
  const requestId = useRef(0);

  const hasEnds =
    draft.waypoints[0]?.place !== null && draft.waypoints[draft.waypoints.length - 1]?.place !== null;
  const waypointKey = JSON.stringify(routableCoordinates(draft.waypoints));

  const recalculate = useCallback(() => {
    const coordinates = routableCoordinates(draft.waypoints);
    if (!hasEnds || coordinates.length < 2) {
      setRouteCalculation({ status: 'idle' });
      setDraft((current) => ({ ...current, preview: null }));
      return;
    }
    const id = (requestId.current += 1);
    setRouteCalculation({ status: 'loading' });
    routing
      .route(coordinates)
      .then((preview) => {
        if (id === requestId.current) {
          setDraft((current) => ({ ...current, preview }));
          setRouteCalculation({ status: 'ready' });
        }
      })
      .catch((error: Error) => {
        if (id === requestId.current) {
          setDraft((current) => ({ ...current, preview: null }));
          setRouteCalculation({ status: 'error', error });
        }
      });
  }, [draft.waypoints, hasEnds]);

  // Points applied from "Haritada düzenle" arrive with their line already calculated.
  const appliedKey = useRef<string | null>(null);
  const currentKey = useRef(waypointKey);

  // Recalculate shortly after the points change (typing, reordering, swapping).
  useEffect(() => {
    currentKey.current = waypointKey;
    if (appliedKey.current === waypointKey) {
      appliedKey.current = null;
      return;
    }
    appliedKey.current = null;
    const timer = setTimeout(recalculate, RECALCULATE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointKey]);

  const setWaypoints = (update: (waypoints: Waypoint[]) => Waypoint[]) =>
    setDraft((current) => ({ ...current, waypoints: update(current.waypoints) }));

  const setWaypointPlace = useCallback((waypointId: string, place: Place | null) => {
    if (place) {
      rememberPlace(place);
    }
    setWaypoints((waypoints) => waypoints.map((waypoint) => (waypoint.id === waypointId ? { ...waypoint, place } : waypoint)));
  }, []);

  const addStop = useCallback(() => {
    setWaypoints((waypoints) => {
      if (waypoints.length - 2 >= MAX_STOPS) {
        return waypoints;
      }
      const next = [...waypoints];
      next.splice(next.length - 1, 0, { id: newId('wp'), kind: 'stop', place: null });
      return next;
    });
  }, []);

  const removeStop = useCallback((waypointId: string) => {
    setWaypoints((waypoints) => waypoints.filter((waypoint) => waypoint.id !== waypointId || waypoint.kind !== 'stop'));
  }, []);

  const moveStop = useCallback((fromIndex: number, toIndex: number) => {
    setWaypoints((waypoints) => {
      const last = waypoints.length - 1;
      if (fromIndex <= 0 || fromIndex >= last || toIndex <= 0 || toIndex >= last) {
        return waypoints;
      }
      const next = [...waypoints];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const swapEnds = useCallback(() => {
    setWaypoints((waypoints) => {
      const next = [...waypoints];
      const last = next.length - 1;
      const start = next[0];
      const end = next[last];
      next[0] = { ...start, place: end.place };
      next[last] = { ...end, place: start.place };
      return next;
    });
  }, []);

  const applyEditedRoute = useCallback((waypoints: Waypoint[], preview: RoutePreview) => {
    requestId.current += 1;
    const key = JSON.stringify(routableCoordinates(waypoints));
    appliedKey.current = key === currentKey.current ? null : key;
    setDraft((current) => ({ ...current, waypoints, preview }));
    setRouteCalculation({ status: 'ready' });
  }, []);

  const updateDetails = useCallback<RouteSuggestionContextValue['updateDetails']>((changes) => {
    setDraft((current) => ({ ...current, ...changes }));
  }, []);

  const setPhotoStatus = (photoId: string, uploadStatus: 'uploading' | 'uploaded' | 'failed') =>
    setDraft((current) => ({
      ...current,
      photos: current.photos.map((photo) => (photo.id === photoId ? { ...photo, uploadStatus } : photo)),
    }));

  const startUpload = useCallback((photoId: string, uri: string, isRetry: boolean) => {
    setPhotoStatus(photoId, 'uploading');
    uploadRoutePhoto(uri, isRetry)
      .then(() => setPhotoStatus(photoId, 'uploaded'))
      .catch(() => setPhotoStatus(photoId, 'failed'));
  }, []);

  const addPhotos = useCallback(
    (uris: string[]) => {
      const room = MAX_SUGGESTION_PHOTOS - draft.photos.length;
      const added = uris.slice(0, Math.max(room, 0)).map((uri) => ({ id: newId('photo'), uri, uploadStatus: 'uploading' as const }));
      setDraft((current) => ({ ...current, photos: [...current.photos, ...added] }));
      added.forEach((photo) => startUpload(photo.id, photo.uri, false));
    },
    [draft.photos.length, startUpload],
  );

  const retryPhoto = useCallback(
    (photoId: string) => {
      const photo = draft.photos.find((item) => item.id === photoId);
      if (photo) {
        startUpload(photo.id, photo.uri, true);
      }
    },
    [draft.photos, startUpload],
  );

  const removePhoto = useCallback((photoId: string) => {
    setDraft((current) => ({ ...current, photos: current.photos.filter((photo) => photo.id !== photoId) }));
  }, []);

  const setCoverPhoto = useCallback((photoId: string) => {
    setDraft((current) => {
      const cover = current.photos.find((photo) => photo.id === photoId);
      return cover ? { ...current, photos: [cover, ...current.photos.filter((photo) => photo.id !== photoId)] } : current;
    });
  }, []);

  const saveAsDraft = useCallback(() => {
    // Uploads don't survive leaving the flow: mark unfinished ones as failed so reopening the
    // draft shows "Tekrar" instead of a spinner that never ends.
    const photos = draft.photos.map((photo) =>
      photo.uploadStatus === 'uploading' ? { ...photo, uploadStatus: 'failed' as const } : photo,
    );
    const saved = saveDraft({ ...draft, photos }, draftId ?? undefined);
    setDraftId(saved.id);
  }, [draft, draftId]);

  const reset = useCallback(() => {
    if (draftId) {
      deleteDraft(draftId);
    }
    requestId.current += 1;
    setDraft(emptyDraft());
    setDraftId(null);
    setRouteCalculation({ status: 'idle' });
    setLastResult(null);
  }, [draftId]);

  const value = useMemo<RouteSuggestionContextValue>(
    () => ({
      draft,
      draftId,
      routeCalculation,
      canContinueFromLocation: hasEnds && routeCalculation.status === 'ready' && draft.preview !== null,
      lastResult,
      setWaypointPlace,
      addStop,
      removeStop,
      moveStop,
      swapEnds,
      applyEditedRoute,
      recalculate,
      updateDetails,
      addPhotos,
      retryPhoto,
      removePhoto,
      setCoverPhoto,
      saveAsDraft,
      setLastResult,
      reset,
    }),
    [
      draft,
      draftId,
      routeCalculation,
      hasEnds,
      lastResult,
      setWaypointPlace,
      addStop,
      removeStop,
      moveStop,
      swapEnds,
      applyEditedRoute,
      recalculate,
      updateDetails,
      addPhotos,
      retryPhoto,
      removePhoto,
      setCoverPhoto,
      saveAsDraft,
      reset,
    ],
  );

  return <RouteSuggestionContext.Provider value={value}>{children}</RouteSuggestionContext.Provider>;
}

export function useRouteSuggestion() {
  const context = useContext(RouteSuggestionContext);
  if (!context) {
    throw new Error('useRouteSuggestion must be used inside RouteSuggestionProvider');
  }
  return context;
}
