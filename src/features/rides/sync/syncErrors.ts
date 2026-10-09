/**
 * Telling apart sync failures that a later try can fix from ones it can't (pure, no imports).
 * Inputs are what the app's Supabase calls throw: `unwrap` errors carry the PostgREST error
 * (`code` = SQLSTATE or `PGRSTnnn`) as `cause`, storage-js errors a `status` / `statusCode`, and
 * `uploadFile` rejects with "Upload failed (<status>): …", "… network error" or "… timeout".
 */

/** `retry`: the connection, the server or the session (backoff); `permanent`: the data itself. */
export type SyncErrorKind = 'retry' | 'permanent';

/** What a ride keeps of a permanent failure (shown generically; the raw text is for logs). */
export type SyncErrorInfo = { code?: string; message: string };

type ErrorLike = { message?: unknown; code?: unknown; status?: unknown; statusCode?: unknown; cause?: unknown; name?: unknown };

const NETWORK = /network|timed? ?out|failed to fetch|fetch failed|request failed|aborted|offline|socket|connection/i;
// An anonymous call (no session attached) is refused on the function's grant, not the data.
const SESSION = /not signed in|jwt|token|unauthori[sz]ed|permission denied for (function|schema)/i;

const asObject = (value: unknown): ErrorLike | null =>
  value && typeof value === 'object' ? (value as ErrorLike) : null;

/** The error and its `cause` chain, outermost first. */
function chain(error: unknown): ErrorLike[] {
  const items: ErrorLike[] = [];
  let current = asObject(error);
  while (current && items.length < 4 && !items.includes(current)) {
    items.push(current);
    current = asObject(current.cause);
  }
  return items;
}

/** The chain's distinct messages (`unwrap` repeats the cause's message). */
function text(items: ErrorLike[]) {
  const messages = items.flatMap((item) =>
    typeof item.message === 'string' && item.message ? [item.message] : [],
  );
  return [...new Set(messages)].join(' · ');
}

function httpStatus(items: ErrorLike[]): number | undefined {
  for (const item of items) {
    for (const value of [item.status, item.statusCode]) {
      const status = typeof value === 'string' ? Number(value) : value;
      if (typeof status === 'number' && status >= 100 && status < 600) {
        return status;
      }
    }
    const match = typeof item.message === 'string' ? /\((\d{3})\)/.exec(item.message) : null;
    if (match) {
      return Number(match[1]);
    }
  }
  return undefined;
}

function errorCode(items: ErrorLike[]): string | undefined {
  for (const item of items) {
    if (typeof item.code === 'string' && item.code.length > 0) {
      return item.code;
    }
  }
  return undefined;
}

/**
 * True when the failure is the connection (or a busy server): the same request can work later
 * without any change, so a photo that failed this way may wait for the ride's sync (08.07).
 */
export function isConnectionError(error: unknown) {
  const items = chain(error);
  if (items.length === 0) {
    return false;
  }
  const status = httpStatus(items);
  if (status !== undefined) {
    return status >= 500 || status === 408 || status === 429;
  }
  return items.some((item) => item.name === 'TypeError') || NETWORK.test(text(items));
}

/**
 * `permanent` only for answers about the data: PostgreSQL integrity / data / privilege errors
 * (classes 23, 22, 42 — except an anonymous call refused for its session — and P0 raised by a
 * function), PostgREST request errors (PGRST1nn) and HTTP 4xx other than 401 / 408 / 429 or a
 * token problem. Everything else, including unknown errors, is retried: a ride never stops
 * syncing because of a guess.
 */
export function classifySyncError(error: unknown): SyncErrorKind {
  const items = chain(error);
  if (items.length === 0 || isConnectionError(error)) {
    return 'retry';
  }
  const message = text(items);
  if (SESSION.test(message)) {
    return 'retry';
  }
  const code = errorCode(items);
  if (code) {
    if (/^PGRST1\d\d$/.test(code)) {
      return 'permanent';
    }
    if (/^(23|22|42|P0)[0-9A-Z]{3}$/.test(code)) {
      return 'permanent';
    }
  }
  const status = httpStatus(items);
  if (status !== undefined && status >= 400 && status < 500 && status !== 401) {
    return 'permanent';
  }
  return 'retry';
}

/** Code and message of a failure, for the ride record and dev logs. */
export function syncErrorInfo(error: unknown): SyncErrorInfo {
  const items = chain(error);
  const code = errorCode(items) ?? httpStatus(items)?.toString();
  const message = text(items) || String(error);
  return code ? { code, message } : { message };
}
