import type { LngLat } from '@/features/routes/types';

import { distanceM, pointAlong, projectOnLine, sliceLine } from './geometry';
import { buildPlan } from './directions/planBuilder';
import type { LocationFix, NavigationPlan, NavigationStep } from './types';

/** Thresholds from the design notes (`h3UnyC`, `O5EZ3F`, `wdREi`, `W0nTTe`). */
export const NAVIGATION_RULES = {
  /** A stop counts as reached within this distance (note: ~20–40 m). */
  stopArrivalM: 30,
  /** The finish counts as reached within this distance. */
  finishArrivalM: 30,
  /** "1. durağa ulaştın" stays at least this long, then until the rider moves. */
  arrivalCardMs: 3_000,
  /** Standing still this long near a reached stop shows "Mola". */
  breakAfterMs: 20_000,
  /** Break detection radius around a reached stop. */
  breakRadiusM: 60,
  /** Below this speed the rider counts as standing. */
  standingSpeedMps: 1,
  /** Above this speed a break ends. */
  movingSpeedMps: 2,
  /** Worse accuracy than this shows "GPS sinyali zayıf". */
  weakAccuracyM: 50,
  /** No fix for this long shows "GPS sinyali kayboldu". */
  lostAfterMs: 30_000,
  /** Further than this from the line (for `offRouteFixes` fixes in a row) means off route. */
  offRouteM: 40,
  offRouteFixes: 2,
  /** The reconnection joins the route this far ahead of the rider. */
  reconnectAheadM: 300,
  /** "Rotaya yeniden bağlandın" stays this long. */
  reconnectedCardMs: 5_000,
  /** Fixes worse than this don't count towards ride distance or route matching. */
  maxUsableAccuracyM: 50,
  /** Smaller moves are GPS jitter, not riding. */
  minMoveM: 2,
  /**
   * A fix is matched at most this far ahead of the rider (or `maxAdvanceMps` × seconds since the
   * last match, if more): a nearer part of the line further on is the route passing itself
   * (U-turn on a divided road, interchange, loop), not progress.
   */
  matchAheadM: 150,
  /** First fix: the ride may start up to the approach threshold (200 m) away, further along a bendy road. */
  firstMatchAheadM: 500,
  maxAdvanceMps: 70,
} as const;

export type TrackedStop = { id: string; name: string; coordinates: LngLat };

export type RideStats = {
  distanceM: number;
  /** Time spent riding (moving), seconds. */
  movingS: number;
  /** Time spent on breaks at stops — kept apart so ride comparisons can skip it. */
  breakS: number;
  /** Breaks taken ("Mola" on the ride detail). */
  breakCount: number;
  elapsedS: number;
  maxSpeedMps: number;
  track: LngLat[];
  startedAt: number;
};

export type GpsState = 'ok' | 'weak' | 'lost';

export type NavigationSnapshot = {
  /** Position on the route (raw position while off route); `null` before the first fix. */
  position: LngLat | null;
  headingDeg: number;
  accuracyM: number | null;
  gps: GpsState;
  traveledM: number;
  remainingM: number;
  remainingS: number;
  /** Epoch ms of the expected arrival. */
  arrivalAt: number;
  /** Upcoming maneuver and the distance to it. */
  nextStep: NavigationStep | null;
  /** The maneuver after it, for the "… yönünde ilerle" line. */
  followingStep: NavigationStep | null;
  distanceToNextStepM: number;
  /** Stops with their state; `nextStopIndex` is the first one not reached yet. */
  stops: { id: string; name: string; reached: boolean }[];
  nextStopIndex: number | null;
  distanceToNextStopM: number | null;
  /** Just reached ("1. durağa ulaştın"); cleared ~3 s later once moving. */
  arrivedStopIndex: number | null;
  /** Standing at a reached stop ("1. durak · Shell / Mola"). */
  breakStopIndex: number | null;
  offRoute: boolean;
  /** Set for a few seconds after a reconnection, with the minutes it added. */
  reconnectedAddedMinutes: number | null;
  finished: boolean;
  ride: RideStats;
};

/**
 * Turn-by-turn state machine. Feed it location fixes (`update`) and a clock (`tick`); it
 * matches the rider to the plan and reports progress, the next maneuver, stops, breaks, GPS
 * quality, off-route state and ride statistics. Pure TypeScript: no timers, no I/O, so the
 * same logic runs on GPS, the background task and the simulator.
 */
export class NavigationTracker {
  private plan: NavigationPlan;
  private readonly stops: TrackedStop[];
  private stopAlongM: number[];
  private readonly reached: boolean[];
  private traveledM = 0;
  private position: LngLat | null = null;
  private headingDeg = 0;
  private accuracyM: number | null = null;
  private lastFixAt: number;
  private lastRaw: LocationFix | null = null;
  private lastMatchedAt: number | null = null;
  private offRouteCount = 0;
  private offRoute = false;
  private arrivedStopIndex: number | null = null;
  private arrivedAt = 0;
  private breakStopIndex: number | null = null;
  private standingSince: number | null = null;
  private reconnectedAddedMinutes: number | null = null;
  private reconnectedAt = 0;
  private finished = false;
  private now: number;
  private readonly ride: RideStats;

  constructor(plan: NavigationPlan, stops: TrackedStop[], now: number) {
    this.plan = plan;
    this.stops = stops;
    this.reached = stops.map(() => false);
    this.stopAlongM = this.alongForStops();
    this.now = now;
    this.lastFixAt = now;
    this.ride = {
      distanceM: 0,
      movingS: 0,
      breakS: 0,
      breakCount: 0,
      elapsedS: 0,
      maxSpeedMps: 0,
      track: [],
      startedAt: now,
    };
  }

  private alongForStops() {
    return this.stops.map(
      (stop) => projectOnLine(stop.coordinates, this.plan.geometry, this.plan.cumulativeM).alongM,
    );
  }

  /** A new position report. */
  update(fix: LocationFix) {
    this.now = fix.timestamp;
    this.lastFixAt = fix.timestamp;
    this.accuracyM = fix.accuracyM;
    if (this.finished) {
      return this.snapshot();
    }
    this.recordRide(fix);

    const usable = fix.accuracyM <= NAVIGATION_RULES.maxUsableAccuracyM;
    const aheadM =
      this.lastMatchedAt === null
        ? NAVIGATION_RULES.firstMatchAheadM
        : Math.max(
            NAVIGATION_RULES.matchAheadM,
            (NAVIGATION_RULES.maxAdvanceMps * (fix.timestamp - this.lastMatchedAt)) / 1000,
          );
    const projection = projectOnLine(
      fix.coordinates,
      this.plan.geometry,
      this.plan.cumulativeM,
      Math.max(0, this.traveledM - NAVIGATION_RULES.offRouteM),
      this.traveledM + aheadM,
    );

    if (usable) {
      if (projection.offsetM > NAVIGATION_RULES.offRouteM) {
        this.offRouteCount += 1;
        if (this.offRouteCount >= NAVIGATION_RULES.offRouteFixes) {
          this.offRoute = true;
        }
      } else {
        this.offRouteCount = 0;
        this.offRoute = false;
        this.traveledM = Math.max(this.traveledM, projection.alongM);
        this.lastMatchedAt = fix.timestamp;
      }
    }

    if (this.offRoute) {
      this.position = fix.coordinates;
      this.headingDeg = fix.headingDeg ?? this.headingDeg;
    } else {
      const along = pointAlong(this.plan.geometry, this.plan.cumulativeM, this.traveledM);
      this.position = along.point;
      this.headingDeg = along.bearing;
    }

    this.updateStops(fix);
    const finish = this.plan.geometry[this.plan.geometry.length - 1];
    if (
      this.plan.distanceM - this.traveledM <= NAVIGATION_RULES.finishArrivalM ||
      // Near the finish counts only past halfway: on a loop the finish is the start.
      (usable &&
        this.traveledM >= this.plan.distanceM / 2 &&
        distanceM(fix.coordinates, finish) <= NAVIGATION_RULES.finishArrivalM)
    ) {
      this.traveledM = this.plan.distanceM;
      this.finished = true;
    }
    this.lastRaw = fix;
    return this.snapshot();
  }

  /** Clock tick for time-based states (GPS lost, card timeouts, elapsed time). */
  tick(now: number) {
    this.now = now;
    if (!this.finished) {
      this.ride.elapsedS = (now - this.ride.startedAt) / 1000;
    }
    return this.snapshot();
  }

  /**
   * Where a reconnection should go: from the rider to a point a little ahead on the remaining
   * route (note `W0nTTe`: rejoin at the best point without asking). `null` while on route.
   */
  reconnectionRequest() {
    if (!this.offRoute || !this.lastRaw) {
      return null;
    }
    const joinAlongM = Math.min(
      this.traveledM + NAVIGATION_RULES.reconnectAheadM,
      this.plan.distanceM,
    );
    return {
      from: this.lastRaw.coordinates,
      to: pointAlong(this.plan.geometry, this.plan.cumulativeM, joinAlongM).point,
      joinAlongM,
    };
  }

  /** Splices a connector plan (rider → join point) in front of the remaining route. */
  applyReconnection(connector: NavigationPlan, joinAlongM: number) {
    const remainingBefore = this.remainingSeconds();
    const rest = sliceLine(this.plan.geometry, this.plan.cumulativeM, joinAlongM);
    const restSteps = this.plan.steps.filter((step) => step.startDistanceM >= joinAlongM);
    const restDuration =
      this.plan.durationS * ((this.plan.distanceM - joinAlongM) / Math.max(this.plan.distanceM, 1));
    const connectorSteps = connector.steps.filter((step) => step.type !== 'arrive');
    const joinGap =
      restSteps.length > 0
        ? restSteps[0].startDistanceM - joinAlongM
        : this.plan.distanceM - joinAlongM;
    if (connectorSteps.length > 0) {
      const last = connectorSteps[connectorSteps.length - 1];
      connectorSteps[connectorSteps.length - 1] = {
        ...last,
        distanceM: last.distanceM + joinGap,
      };
    }
    const geometry = [...connector.geometry, ...rest.slice(1)];
    this.plan = buildPlan(
      geometry,
      [...connectorSteps, ...restSteps].map(({ startDistanceM: _unused, ...step }) => step),
      connector.durationS + restDuration,
    );
    this.stopAlongM = this.alongForStops().map((along, index) =>
      this.reached[index] ? -1 : along,
    );
    this.traveledM = 0;
    this.lastMatchedAt = null;
    this.offRoute = false;
    this.offRouteCount = 0;
    const added = Math.round((this.remainingSeconds() - remainingBefore) / 60);
    this.reconnectedAddedMinutes = Math.max(1, added);
    this.reconnectedAt = this.now;
  }

  /** The plan in use (changes after a reconnection). */
  currentPlan() {
    return this.plan;
  }

  private remainingSeconds() {
    const remaining = Math.max(0, this.plan.distanceM - this.traveledM);
    return this.plan.distanceM > 0 ? (this.plan.durationS * remaining) / this.plan.distanceM : 0;
  }

  private updateStops(fix: LocationFix) {
    const nextIndex = this.reached.indexOf(false);
    if (nextIndex >= 0) {
      const stop = this.stops[nextIndex];
      const near = distanceM(fix.coordinates, stop.coordinates) <= NAVIGATION_RULES.stopArrivalM;
      const passed =
        !this.offRoute &&
        this.traveledM >= this.stopAlongM[nextIndex] + NAVIGATION_RULES.stopArrivalM;
      if (near || passed) {
        // A stop is a waypoint, not the finish: it completes on its own (note `oWZdq`).
        this.reached[nextIndex] = true;
        this.arrivedStopIndex = nextIndex;
        this.arrivedAt = fix.timestamp;
      }
    }

    const speed = fix.speedMps ?? this.speedFromLast(fix);
    const moving = speed > NAVIGATION_RULES.movingSpeedMps;
    if (
      this.arrivedStopIndex !== null &&
      fix.timestamp - this.arrivedAt >= NAVIGATION_RULES.arrivalCardMs &&
      moving
    ) {
      this.arrivedStopIndex = null;
    }

    // Breaks: standing near the last reached stop (note `O5EZ3F`), cleared on moving again.
    const lastReached = this.reached.lastIndexOf(true);
    const atStop =
      lastReached >= 0 &&
      distanceM(fix.coordinates, this.stops[lastReached].coordinates) <=
        NAVIGATION_RULES.breakRadiusM;
    if (atStop && speed < NAVIGATION_RULES.standingSpeedMps) {
      this.standingSince ??= fix.timestamp;
      if (
        this.breakStopIndex === null &&
        fix.timestamp - this.standingSince >= NAVIGATION_RULES.breakAfterMs
      ) {
        this.breakStopIndex = lastReached;
        this.ride.breakCount += 1;
        this.arrivedStopIndex = null;
        // The whole stand counts as break time, not only the part after it was recognised.
        this.ride.breakS += (fix.timestamp - this.standingSince) / 1000;
      }
    } else if (moving || !atStop) {
      this.standingSince = null;
      this.breakStopIndex = null;
    }
  }

  private speedFromLast(fix: LocationFix) {
    if (!this.lastRaw) {
      return 0;
    }
    const seconds = (fix.timestamp - this.lastRaw.timestamp) / 1000;
    return seconds > 0 ? distanceM(this.lastRaw.coordinates, fix.coordinates) / seconds : 0;
  }

  private recordRide(fix: LocationFix) {
    const previous = this.lastRaw;
    if (fix.accuracyM > NAVIGATION_RULES.maxUsableAccuracyM) {
      return;
    }
    const speed = fix.speedMps ?? this.speedFromLast(fix);
    this.ride.maxSpeedMps = Math.max(this.ride.maxSpeedMps, speed);
    if (!previous) {
      this.ride.track.push(fix.coordinates);
      return;
    }
    const seconds = Math.max(0, (fix.timestamp - previous.timestamp) / 1000);
    const moved = distanceM(previous.coordinates, fix.coordinates);
    if (moved >= NAVIGATION_RULES.minMoveM) {
      this.ride.distanceM += moved;
      this.ride.track.push(fix.coordinates);
    }
    if (this.breakStopIndex !== null) {
      this.ride.breakS += seconds;
    } else if (speed >= NAVIGATION_RULES.standingSpeedMps) {
      this.ride.movingS += seconds;
    }
  }

  snapshot(): NavigationSnapshot {
    const steps = this.plan.steps;
    const nextIndex = steps.findIndex((step) => step.startDistanceM > this.traveledM + 1);
    const nextStep = nextIndex >= 0 ? steps[nextIndex] : null;
    const followingStep = nextIndex >= 0 ? (steps[nextIndex + 1] ?? null) : null;
    const remainingS = this.remainingSeconds();
    const nextStopIndex = this.reached.indexOf(false);
    const sinceFix = this.now - this.lastFixAt;
    const gps: GpsState =
      sinceFix >= NAVIGATION_RULES.lostAfterMs
        ? 'lost'
        : this.accuracyM !== null && this.accuracyM > NAVIGATION_RULES.weakAccuracyM
          ? 'weak'
          : 'ok';
    if (
      this.reconnectedAddedMinutes !== null &&
      this.now - this.reconnectedAt > NAVIGATION_RULES.reconnectedCardMs
    ) {
      this.reconnectedAddedMinutes = null;
    }

    return {
      position: this.position,
      headingDeg: this.headingDeg,
      accuracyM: this.accuracyM,
      gps,
      traveledM: this.traveledM,
      remainingM: Math.max(0, this.plan.distanceM - this.traveledM),
      remainingS,
      arrivalAt: this.now + remainingS * 1000,
      nextStep,
      followingStep,
      distanceToNextStepM: nextStep ? Math.max(0, nextStep.startDistanceM - this.traveledM) : 0,
      stops: this.stops.map((stop, index) => ({
        id: stop.id,
        name: stop.name,
        reached: this.reached[index],
      })),
      nextStopIndex: nextStopIndex >= 0 ? nextStopIndex : null,
      distanceToNextStopM:
        nextStopIndex >= 0 ? Math.max(0, this.stopAlongM[nextStopIndex] - this.traveledM) : null,
      arrivedStopIndex: this.arrivedStopIndex,
      breakStopIndex: this.breakStopIndex,
      offRoute: this.offRoute,
      reconnectedAddedMinutes: this.reconnectedAddedMinutes,
      finished: this.finished,
      ride: { ...this.ride, track: this.ride.track },
    };
  }
}
