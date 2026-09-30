import { deleteDraft, saveDraft } from './draftStore';
import { suggestionSubmitter } from './services';
import type { RouteSuggestionDraft, SubmissionProgress, SubmissionResult } from './types';

/** `progress` is the last report, kept after settling so the screen doesn't jump back to 0 %. */
export type SubmissionRunState =
  | { status: 'running'; progress: SubmissionProgress | null }
  | { status: 'succeeded'; progress: SubmissionProgress | null; result: SubmissionResult }
  | { status: 'failed'; progress: SubmissionProgress | null; error: Error };

/** Called once when a run that was sent to the background ("Arka planda devam et") settles. */
export type BackgroundSettledHandler = (state: Exclude<SubmissionRunState, { status: 'running' }>) => void;

export type SubmissionRun = {
  readonly id: string;
  /** Snapshot of the draft at the moment sending started; saved as a draft if sending fails. */
  readonly draft: RouteSuggestionDraft;
  /** Saved draft this run belongs to, if the flow was opened from / saved as one. */
  readonly draftId: string | null;
  getState: () => SubmissionRunState;
  subscribe: (listener: () => void) => () => void;
  /** True once the user left the sending screen; the screen no longer reacts to the result. */
  readonly inBackground: boolean;
};

type MutableRun = {
  -readonly [K in keyof SubmissionRun]: SubmissionRun[K];
} & {
  state: SubmissionRunState;
  listeners: Set<() => void>;
  onBackgroundSettled: BackgroundSettledHandler | null;
};

/**
 * Keeps route-suggestion submissions alive outside React (04.4). The sending screen only
 * observes a run, so leaving it — "Arka planda devam et", which dismisses the whole flow and
 * unmounts `RouteSuggestionProvider` — does not cancel the upload.
 *
 * While the sending screen is watching, it handles a failure itself (`saveAsDraft()` on the
 * provider, so the flow keeps editing the same saved draft). A run that fails in the
 * background saves the draft here, because the provider is gone by then. A successful run
 * deletes the draft it was sent from either way.
 */
let foregroundRun: MutableRun | null = null;
let runCounter = 0;

function settle(run: MutableRun, state: Exclude<SubmissionRunState, { status: 'running' }>) {
  if (state.status === 'failed') {
    if (run.inBackground) {
      saveDraft(run.draft, run.draftId ?? undefined);
    }
  } else if (run.draftId) {
    deleteDraft(run.draftId);
  }
  update(run, state);
  if (run.inBackground) {
    run.onBackgroundSettled?.(state);
    run.onBackgroundSettled = null;
  }
}

function update(run: MutableRun, state: SubmissionRunState) {
  run.state = state;
  run.listeners.forEach((listener) => listener());
}

/**
 * Starts sending `draft`, or returns the run already in flight for the sending screen. The
 * reuse is the double-start guard: React re-runs mount effects in development, and the screen
 * can remount while a run is still going.
 */
export function startSubmission(draft: RouteSuggestionDraft, draftId: string | null): SubmissionRun {
  if (foregroundRun && foregroundRun.state.status === 'running') {
    return foregroundRun;
  }
  const run: MutableRun = {
    id: `submission-${(runCounter += 1)}`,
    draft,
    draftId,
    inBackground: false,
    state: { status: 'running', progress: null },
    listeners: new Set(),
    onBackgroundSettled: null,
    getState: () => run.state,
    subscribe: (listener) => {
      run.listeners.add(listener);
      return () => run.listeners.delete(listener);
    },
  };
  foregroundRun = run;

  suggestionSubmitter
    .submit(draft, (progress) => {
      if (run.state.status === 'running') {
        update(run, { status: 'running', progress });
      }
    })
    .then(
      (result) => settle(run, { status: 'succeeded', progress: run.state.progress, result }),
      (error: unknown) =>
        settle(run, {
          status: 'failed',
          progress: run.state.progress,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );

  return run;
}

/**
 * "Arka planda devam et": detaches the run from the sending screen. `onSettled` fires once
 * with the outcome (immediately if the run already finished), e.g. to show a toast.
 */
export function sendSubmissionToBackground(run: SubmissionRun, onSettled: BackgroundSettledHandler) {
  const mutable = run as MutableRun;
  mutable.inBackground = true;
  if (foregroundRun === mutable) {
    foregroundRun = null;
  }
  const { state } = mutable;
  if (state.status === 'running') {
    mutable.onBackgroundSettled = onSettled;
  } else {
    onSettled(state);
  }
}

