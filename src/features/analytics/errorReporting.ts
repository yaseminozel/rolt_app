import { hasSupabase } from '@/lib/supabase/client';

import { appContextFields, clip } from './appContext';
import { createTelemetryQueue, startTelemetryFlushing } from './telemetryQueue';

/**
 * JS errors to `public.app_errors` (docs/supabase.md "Telemetry"): the global handler (uncaught
 * and fatal errors), unhandled promise rejections in release builds and the root error boundary.
 * The same error is sent once per launch (repeats before sending raise `occurrences`). A fatal
 * error is written to the device synchronously first, so it goes out on the next launch if the app
 * dies before the insert. Native crashes are out of reach here (they need Sentry / Crashlytics).
 */
export type ErrorKind = 'global' | 'promise' | 'boundary';

type ReportOptions = { kind: ErrorKind; isFatal: boolean; componentStack?: string | null };

/** The default handler ends the app on a fatal error; the insert gets at most this long. */
const FATAL_FLUSH_WAIT_MS = 1_500;

const errors = createTelemetryQueue('app_errors', {
  storageKey: 'rolt.telemetry.errors',
  batchSize: 1,
  maxBacklog: 30,
});

type ErrorRow = Parameters<typeof errors.enqueue>[0];

/** Rows of this launch by error, for the dedupe. */
const seen = new Map<string, ErrorRow>();
let screen: string | null = null;
let reporting = false;

/** The route pattern on screen (e.g. `rides/[rideId]`), attached to errors. */
export function setErrorScreen(next: string | null) {
  screen = next;
}

function describe(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack ?? null };
  }
  if (typeof error === 'string') {
    return { name: null, message: error, stack: null };
  }
  try {
    return { name: null, message: JSON.stringify(error) ?? String(error), stack: null };
  } catch {
    return { name: null, message: String(error), stack: null };
  }
}

/** Message plus the first stack frame: the same throw site counts as the same error. */
function dedupeKey(message: string, stack: string | null) {
  const frame = stack?.split('\n').find((line) => line.includes('@') || line.trim().startsWith('at ')) ?? '';
  return `${message}|${frame.trim()}`;
}

export function reportError(error: unknown, { kind, isFatal, componentStack }: ReportOptions) {
  // An error while reporting must not report itself again.
  if (reporting || !hasSupabase) {
    return;
  }
  reporting = true;
  try {
    const { name, message, stack } = describe(error);
    const key = dedupeKey(message, stack);
    const earlier = seen.get(key);
    if (earlier) {
      if (errors.pending().some((item) => item.row === earlier)) {
        earlier.occurrences = Math.min((earlier.occurrences ?? 1) + 1, 10_000);
        earlier.is_fatal = earlier.is_fatal || isFatal;
      }
    } else {
      const row: ErrorRow = {
        ...appContextFields(),
        kind,
        is_fatal: isFatal,
        name: clip(name, 128),
        message: clip(message, 1024) ?? 'Unknown error',
        stack: clip(stack, 8192),
        component_stack: clip(componentStack, 8192),
        screen: clip(screen, 256),
        occurrences: 1,
        occurred_at: new Date().toISOString(),
      };
      seen.set(key, row);
      errors.enqueue(row);
    }
    if (isFatal) {
      errors.persistNow();
    }
  } catch {
    // Reporting never throws.
  } finally {
    reporting = false;
  }
}

type PromiseRejectionTracker = (options: {
  allRejections: boolean;
  onUnhandled: (id: number, rejection: unknown) => void;
  onHandled: (id: number) => void;
}) => void;

function install() {
  if (!hasSupabase || typeof ErrorUtils === 'undefined') {
    return;
  }
  startTelemetryFlushing();

  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { kind: 'global', isFatal: Boolean(isFatal) });
    if (!isFatal) {
      previous(error, isFatal);
      return;
    }
    // Best effort: let the insert go out before the default handler ends the app.
    let handed = false;
    const handOver = () => {
      if (!handed) {
        handed = true;
        previous(error, isFatal);
      }
    };
    errors.flush().finally(handOver);
    setTimeout(handOver, FATAL_FLUSH_WAIT_MS);
  });

  // React Native tracks rejections only in development (LogBox warnings); release builds use ours.
  const tracker = (globalThis as { HermesInternal?: { enablePromiseRejectionTracker?: PromiseRejectionTracker } })
    .HermesInternal?.enablePromiseRejectionTracker;
  if (!__DEV__ && tracker) {
    tracker({
      allRejections: true,
      onUnhandled: (_id, rejection) => reportError(rejection, { kind: 'promise', isFatal: false }),
      onHandled: () => undefined,
    });
  }
}

install();
