import { appContextFields } from './appContext';
import { createTelemetryQueue, startTelemetryFlushing } from './telemetryQueue';

/** Values an event may carry: flat primitives only (no coordinates, no emails, no objects). */
type EventValue = string | number | boolean | null;
type EventProps = Record<string, EventValue>;

export type GpsTelemetryContext = 'record' | 'navigation';

/**
 * Product analytics events named in the design notes (e.g. onboarding note `xx2W7`) and GPS health
 * measurements. They go to the self-hosted Supabase (`public.app_events`, docs/supabase.md
 * "Telemetry"); development builds also log them.
 */
export type AnalyticsEvents = {
  /** Onboarding page shown (1–3). */
  onboarding_page_view: { page: number };
  /** "Atla" on onboarding, with the page it was tapped on. */
  onboarding_skip: { page: number };
  /** "Hemen başla" on the last onboarding page. */
  onboarding_start: undefined;
  /** "Giriş yap" on the last onboarding page. */
  onboarding_login_tap: undefined;
  /** GPS left "good" (or got worse) while recording or navigating. */
  gps_degraded: {
    state: 'weak' | 'lost';
    context: GpsTelemetryContext;
    moving: boolean;
    /** Last fix accuracy, rounded; `null` before any fix. */
    accuracyM: number | null;
    /** Seconds since the last fix. */
    silenceS: number | null;
    simulated: boolean;
  };
  /** GPS good again; `state` is the worst state of the episode. */
  gps_recovered: {
    state: 'weak' | 'lost';
    context: GpsTelemetryContext;
    durationS: number;
    simulated: boolean;
  };
  /** GPS health over a whole ride (recording finished / discarded, navigation left). */
  ride_gps_summary: {
    context: GpsTelemetryContext;
    durationS: number;
    weakCount: number;
    lostCount: number;
    weakSeconds: number;
    lostSeconds: number;
    /** Average gap between fixes while riding (manual pauses excluded); `null` with < 2 fixes. */
    fixIntervalAvgMs: number | null;
    fixCount: number;
    simulated: boolean;
  };
};

type EventArgs<E extends keyof AnalyticsEvents> = AnalyticsEvents[E] extends undefined
  ? []
  : [properties: AnalyticsEvents[E]];

const MAX_STRING_LENGTH = 200;
const MAX_PROPS_BYTES = 4_000;

const events = createTelemetryQueue('app_events', {
  storageKey: 'rolt.telemetry.events',
  batchSize: 20,
  maxBacklog: 100,
});

/** Keeps primitives only, clipped, and under the server's 4 KB limit. */
function sanitize(properties: object | undefined): EventProps {
  const props: EventProps = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (typeof value === 'string') {
      props[key] = value.slice(0, MAX_STRING_LENGTH);
    } else if (typeof value === 'number') {
      props[key] = Number.isFinite(value) ? value : null;
    } else if (typeof value === 'boolean' || value === null) {
      props[key] = value;
    }
  }
  return JSON.stringify(props).length <= MAX_PROPS_BYTES ? props : { truncated: true };
}

export function trackEvent<E extends keyof AnalyticsEvents>(event: E, ...args: EventArgs<E>) {
  if (__DEV__) {
    console.log('[analytics]', event, args[0] ?? '');
  }
  try {
    startTelemetryFlushing();
    events.enqueue({
      ...appContextFields(),
      name: event,
      props: sanitize(args[0]),
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // Analytics never breaks the app.
  }
}
