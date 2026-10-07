import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Route } from '@/features/routes/types';

import { MAX_RIDE_STOPS, rideLine, sortStopsAlongRoute } from './ridePlan';
import type { StopCandidate } from './stops/stopSearch';
import type { NavigationPlan, RideStop } from './types';

type RideSession = {
  route: Route;
  /** ⇅ on 06.01: ride the route from its finish to its start. */
  reversed: boolean;
  toggleReversed: () => void;
  /** Rider's stops in riding order (at most three, note `mUNKb`). */
  stops: RideStop[];
  canAddStop: boolean;
  /** Adds a stop in route order; returns false when the limit is reached. */
  addStop: (stop: RideStop) => boolean;
  removeStop: (id: string) => void;
  /** Puts back stops removed or added by mistake ("Geri al"). */
  setStops: (stops: RideStop[]) => void;
  moveStop: (from: number, to: number) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  keepScreenOn: boolean;
  setKeepScreenOn: (enabled: boolean) => void;
  /** The plan the rider confirmed on 06.01; navigation starts from it. */
  plan: NavigationPlan | null;
  setPlan: (plan: NavigationPlan | null) => void;
  /** True when the plan begins with an approach leg from the rider's position. */
  hasApproach: boolean;
  setHasApproach: (value: boolean) => void;
  /** Place picked on 06.02, shown on the preview (06.03) before it becomes a stop. */
  pendingStop: StopCandidate | null;
  setPendingStop: (candidate: StopCandidate | null) => void;
  /** Set by the exit confirmation (06.06 "Bitir"); the navigation screen ends the ride. */
  endRequested: boolean;
  requestEnd: () => void;
};

const RideSessionContext = createContext<RideSession | null>(null);

/**
 * State of one "Rotayı sür" session (06.01–06.07), shared by the ride stack's screens and sheets.
 * Mounted by `ride/_layout.tsx` once the route is loaded.
 */
export function RideSessionProvider({ route, children }: { route: Route; children: ReactNode }) {
  const [reversed, setReversed] = useState(false);
  const [stops, setStopsState] = useState<RideStop[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [keepScreenOn, setKeepScreenOn] = useState(true);
  const [plan, setPlan] = useState<NavigationPlan | null>(null);
  const [hasApproach, setHasApproach] = useState(false);
  const [pendingStop, setPendingStop] = useState<StopCandidate | null>(null);
  const [endRequested, setEndRequested] = useState(false);
  const requestEnd = useCallback(() => setEndRequested(true), []);

  const toggleReversed = useCallback(() => {
    setReversed((value) => !value);
    setPlan(null);
  }, []);

  const addStop = useCallback(
    (stop: RideStop) => {
      if (stops.length >= MAX_RIDE_STOPS) {
        return false;
      }
      setStopsState(sortStopsAlongRoute([...stops, stop], rideLine(route, reversed)));
      setPlan(null);
      return true;
    },
    [reversed, route, stops],
  );

  const removeStop = useCallback((id: string) => {
    setStopsState((current) => current.filter((stop) => stop.id !== id));
    setPlan(null);
  }, []);

  const setStops = useCallback((next: RideStop[]) => {
    setStopsState(next.slice(0, MAX_RIDE_STOPS));
    setPlan(null);
  }, []);

  const moveStop = useCallback((from: number, to: number) => {
    setStopsState((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
      return next;
    });
    setPlan(null);
  }, []);

  const value = useMemo<RideSession>(
    () => ({
      route,
      reversed,
      toggleReversed,
      stops,
      canAddStop: stops.length < MAX_RIDE_STOPS,
      addStop,
      removeStop,
      setStops,
      moveStop,
      voiceEnabled,
      setVoiceEnabled,
      keepScreenOn,
      setKeepScreenOn,
      plan,
      setPlan,
      hasApproach,
      setHasApproach,
      pendingStop,
      setPendingStop,
      endRequested,
      requestEnd,
    }),
    [
      route,
      reversed,
      toggleReversed,
      stops,
      addStop,
      removeStop,
      setStops,
      moveStop,
      voiceEnabled,
      keepScreenOn,
      plan,
      hasApproach,
      pendingStop,
      endRequested,
      requestEnd,
    ],
  );

  return <RideSessionContext.Provider value={value}>{children}</RideSessionContext.Provider>;
}

export function useRideSession() {
  const context = useContext(RideSessionContext);
  if (!context) {
    throw new Error('useRideSession must be used inside RideSessionProvider');
  }
  return context;
}
