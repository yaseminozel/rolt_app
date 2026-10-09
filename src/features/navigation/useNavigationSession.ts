import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { navigationDirections } from './directions';
import { gpsDiagnostics } from './gpsDiagnostics';
import { fixArrival } from './gpsHealth';
import { maneuverTitle } from './instructions';
import { NavigationTracker, type NavigationSnapshot, type TrackedStop } from './navigationTracker';
import type { LocationSource, NavigationPlan } from './types';
import { LocationPowerController } from './standingPower';
import { speak, stopSpeaking, VOICE_THRESHOLDS_M } from './voiceGuidance';
import { GpsTelemetry } from '@/features/analytics/gpsTelemetry';
import { leanCalibration } from '@/features/lean/leanCalibration';
import { LEAN_SENSOR_RULES } from '@/features/lean/leanMath';
import { createLeanLogger } from '@/features/lean/leanLog';
import { subscribeLean } from '@/features/lean/leanSensor';

const TICK_MS = 1_000;
const LEAN_INTERVAL_MS = 100;
/** Wait before trying a failed reconnection again. */
const RECONNECT_RETRY_MS = 10_000;

type NavigationSessionOptions = {
  plan: NavigationPlan;
  stops: TrackedStop[];
  source: LocationSource;
  voiceEnabled: boolean;
};

/**
 * Runs a navigation: starts the location source, feeds the tracker, reconnects automatically
 * when the rider leaves the route (note `W0nTTe`), and speaks maneuvers, stop arrivals and the
 * finish when voice guidance is on. Returns the latest snapshot and the plan in use.
 */
export function useNavigationSession({ plan, stops, source, voiceEnabled }: NavigationSessionOptions) {
  const { t } = useTranslation('ride');
  const [tracker] = useState(() => new NavigationTracker(plan, stops, source.now()));
  const [snapshot, setSnapshot] = useState<NavigationSnapshot>(() => tracker.snapshot());
  const [activePlan, setActivePlan] = useState(plan);
  const reconnecting = useRef(false);
  const lastReconnectFailure = useRef(0);
  const voiceRef = useRef(voiceEnabled);
  const tRef = useRef(t);

  useEffect(() => {
    voiceRef.current = voiceEnabled;
    tRef.current = t;
    if (!voiceEnabled) {
      stopSpeaking();
    }
  }, [t, voiceEnabled]);

  useEffect(() => {
    let stopSource: (() => void) | null = null;
    let cancelled = false;
    const announced = new Set<string>();
    let lastStatus = { offRoute: false, reconnected: false, arrived: null as number | null, finished: false };
    const gpsTelemetry = new GpsTelemetry('navigation');

    const announce = (key: string, text: string) => {
      if (voiceRef.current && !announced.has(key)) {
        announced.add(key);
        speak(text);
      }
    };

    const handle = (next: NavigationSnapshot) => {
      setSnapshot(next);
      gpsTelemetry.observe(next.gps);
      const translate = tRef.current;

      // Maneuver call-outs at the voice thresholds, once per step and threshold.
      if (next.nextStep && !next.offRoute) {
        const stepKey = `${next.nextStep.startDistanceM.toFixed(0)}`;
        for (const threshold of VOICE_THRESHOLDS_M) {
          if (next.distanceToNextStepM <= threshold) {
            const stopNumber =
              next.nextStep.type === 'arrive' && next.nextStopIndex !== null ? next.nextStopIndex + 1 : null;
            announce(
              `${stepKey}:${threshold}`,
              maneuverTitle(next.nextStep, next.distanceToNextStepM, translate, { stopNumber }),
            );
          }
        }
      }
      if (next.offRoute && !lastStatus.offRoute) {
        announce(`offRoute:${Date.now()}`, translate('voice.offRoute'));
      }
      if (next.reconnectedAddedMinutes !== null && !lastStatus.reconnected) {
        announce(`reconnected:${Date.now()}`, translate('voice.reconnected'));
      }
      if (next.arrivedStopIndex !== null && next.arrivedStopIndex !== lastStatus.arrived) {
        announce(`stop:${next.arrivedStopIndex}`, translate('voice.stopReached', { number: next.arrivedStopIndex + 1 }));
      }
      if (next.finished && !lastStatus.finished) {
        announce('finished', translate('voice.finished'));
      }
      lastStatus = {
        offRoute: next.offRoute,
        reconnected: next.reconnectedAddedMinutes !== null,
        arrived: next.arrivedStopIndex,
        finished: next.finished,
      };

      // Rejoin the route without asking (one request at a time, retried after a failure).
      const request = tracker.reconnectionRequest();
      if (request && !reconnecting.current && source.now() - lastReconnectFailure.current > RECONNECT_RETRY_MS) {
        reconnecting.current = true;
        navigationDirections
          .plan([
            { coordinates: request.from, kind: 'waypoint' },
            { coordinates: request.to, kind: 'waypoint' },
          ])
          .then((connector) => {
            if (cancelled) {
              return;
            }
            tracker.applyReconnection(connector, request.joinAlongM);
            setActivePlan(tracker.currentPlan());
            handle(tracker.snapshot());
          })
          .catch(() => {
            lastReconnectFailure.current = source.now();
          })
          .finally(() => {
            reconnecting.current = false;
          });
      }
    };

    // A long stop (lights, a break at a stop) lets the GPS slow down; the first move wakes it.
    const power = new LocationPowerController((mode) => {
      source.setPowerMode?.(mode).catch(() => undefined);
    });

    source
      .start((fix) => {
        if (!cancelled) {
          const next = tracker.update(fix);
          gpsTelemetry.observeFix(fix);
          power.addFix(fix, next.gps === 'ok');
          if (__DEV__) {
            gpsDiagnostics.health(tracker.gpsDiagnostics(fixArrival(fix)));
          }
          handle(next);
        }
      })
      .then((stop) => {
        if (cancelled) {
          stop();
        } else {
          stopSource = stop;
        }
      })
      .catch(() => undefined);

    const timer = setInterval(() => {
      if (!cancelled) {
        const now = source.now();
        const next = tracker.tick(now);
        power.tick(now, next.gps === 'ok');
        if (__DEV__) {
          gpsDiagnostics.health(tracker.gpsDiagnostics(now));
        }
        handle(next);
      }
    }, TICK_MS);

    // Calibrated phones measure lean with the motion sensors (08.00).
    const calibration = leanCalibration.get();
    let smoothed: number | null = null;
    const logLean = createLeanLogger('navigation');
    const leanSubscription = calibration
      ? subscribeLean((sample) => {
          const lean = sample.rawDeg - calibration.offsetDeg;
          smoothed =
            smoothed === null ? lean : smoothed + (lean - smoothed) * LEAN_SENSOR_RULES.smoothing;
          logLean(smoothed, sample.rawDeg, calibration.offsetDeg);
          tracker.addSensorLean(smoothed);
        }, LEAN_INTERVAL_MS)
      : null;

    return () => {
      cancelled = true;
      leanSubscription?.remove();
      clearInterval(timer);
      stopSource?.();
      stopSpeaking();
      gpsTelemetry.finish();
    };
  }, [source, tracker]);

  return { snapshot, plan: activePlan };
}
