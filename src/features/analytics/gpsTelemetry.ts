import { GPS_HEALTH_RULES } from '@/features/navigation/gpsHealth';
import { isSimulatedNavigation } from '@/features/navigation/location';
import type { LocationFix } from '@/features/navigation/types';

import { trackEvent, type GpsTelemetryContext } from './track';

/** Recorder (`searching` / `good`) and navigation (`ok`) states; only `weak` and `lost` are bad. */
type ObservedGps = 'searching' | 'good' | 'ok' | 'weak' | 'lost';
type Health = 'good' | 'weak' | 'lost';

/** A tunnel stretch can flap; after this many `gps_degraded` events a ride only counts them. */
const MAX_DEGRADED_EVENTS = 30;
/** Shorter sessions (e.g. a screen opened and left) send no summary. */
const MIN_SUMMARY_S = 30;

const seconds = (ms: number) => Math.round(ms / 1000);

/**
 * GPS health of one ride for `app_events` (docs/supabase.md "Telemetry"): `gps_degraded` when
 * GPS turns weak or lost, `gps_recovered` when it is good again, `ride_gps_summary` at the end.
 * The recording / navigation feeds it the fixes and the state it shows; it keeps no coordinates.
 * Time spent paused by hand is not measured (slow fixes there are the power mode, not GPS).
 */
export class GpsTelemetry {
  private health: Health = 'good';
  private worst: Health = 'good';
  private episodeStartedAt = 0;
  private lastObservedAt: number | null = null;
  private paused = false;
  private activeMs = 0;
  private weakMs = 0;
  private lostMs = 0;
  private weakCount = 0;
  private lostCount = 0;
  private degradedEvents = 0;
  private lastFixAt: number | null = null;
  private lastAccuracyM: number | null = null;
  private moving = false;
  private intervalSumMs = 0;
  private intervalCount = 0;
  private fixCount = 0;
  private finished = false;

  constructor(private readonly context: GpsTelemetryContext) {}

  /** Every fix the location source delivers. */
  observeFix(fix: LocationFix, now = Date.now()) {
    if (this.lastFixAt !== null && !this.paused) {
      this.intervalSumMs += now - this.lastFixAt;
      this.intervalCount += 1;
    }
    this.lastFixAt = now;
    this.lastAccuracyM = fix.accuracyM;
    this.fixCount += 1;
    if (fix.accuracyM <= GPS_HEALTH_RULES.weakAccuracyM && fix.speedMps !== null) {
      this.moving = fix.speedMps >= GPS_HEALTH_RULES.standingSpeedMps;
    }
  }

  /** The GPS state shown to the rider; `paused` while the rider paused the recording by hand. */
  observe(gps: ObservedGps, { paused = false, now = Date.now() }: { paused?: boolean; now?: number } = {}) {
    if (this.finished) {
      return;
    }
    if (this.lastObservedAt !== null && !this.paused) {
      const elapsed = now - this.lastObservedAt;
      this.activeMs += elapsed;
      if (this.health === 'weak') {
        this.weakMs += elapsed;
      } else if (this.health === 'lost') {
        this.lostMs += elapsed;
      }
    }
    this.lastObservedAt = now;
    this.paused = paused;
    // A manual pause closes an open episode quietly: what follows is not comparable.
    const next: Health = paused || (gps !== 'weak' && gps !== 'lost') ? 'good' : gps;
    if (next === this.health) {
      return;
    }
    if (next === 'good') {
      if (!paused) {
        trackEvent('gps_recovered', {
          state: this.worst === 'lost' ? 'lost' : 'weak',
          context: this.context,
          durationS: seconds(now - this.episodeStartedAt),
          simulated: isSimulatedNavigation,
        });
      }
      this.worst = 'good';
    } else {
      if (this.health === 'good') {
        this.episodeStartedAt = now;
      }
      if (next === 'weak') {
        this.weakCount += 1;
      } else {
        this.lostCount += 1;
      }
      this.worst = this.worst === 'lost' ? 'lost' : next;
      if (this.degradedEvents < MAX_DEGRADED_EVENTS) {
        this.degradedEvents += 1;
        trackEvent('gps_degraded', {
          state: next,
          context: this.context,
          moving: this.moving,
          accuracyM: this.lastAccuracyM === null ? null : Math.round(this.lastAccuracyM),
          silenceS: this.lastFixAt === null ? null : seconds(now - this.lastFixAt),
          simulated: isSimulatedNavigation,
        });
      }
    }
    this.health = next;
  }

  /** The ride ended (saved as a draft, discarded, or navigation left); sends the summary once. */
  finish(now = Date.now()) {
    if (this.finished) {
      return;
    }
    this.observe(this.health, { paused: this.paused, now });
    this.finished = true;
    const durationS = seconds(this.activeMs);
    if (durationS < MIN_SUMMARY_S) {
      return;
    }
    trackEvent('ride_gps_summary', {
      context: this.context,
      durationS,
      weakCount: this.weakCount,
      lostCount: this.lostCount,
      weakSeconds: seconds(this.weakMs),
      lostSeconds: seconds(this.lostMs),
      fixIntervalAvgMs: this.intervalCount > 0 ? Math.round(this.intervalSumMs / this.intervalCount) : null,
      fixCount: this.fixCount,
      simulated: isSimulatedNavigation,
    });
  }
}
