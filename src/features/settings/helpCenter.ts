/**
 * "Yardım ve SSS" (10.12) content, keyed into `settings:help.questions.*`. The design draws the
 * categories and four frequent questions only; the answers are draft copy written from the app's
 * actual behaviour and need product review (CLAUDE.md).
 */
export type HelpCategory = 'recording' | 'routes' | 'account' | 'permissions';

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  'recording',
  'routes',
  'account',
  'permissions',
];

export type HelpQuestion =
  | 'stopped'
  | 'gpsDrift'
  | 'tooShort'
  | 'offline'
  | 'shareRide'
  | 'rideRoute'
  | 'saveRoute'
  | 'visibility'
  | 'hideEndpoints'
  | 'password'
  | 'background'
  | 'noNotifications'
  | 'photoAccess';

export const HELP_QUESTIONS: Record<HelpCategory, readonly HelpQuestion[]> = {
  recording: ['stopped', 'gpsDrift', 'tooShort', 'offline'],
  routes: ['shareRide', 'rideRoute', 'saveRoute'],
  account: ['visibility', 'hideEndpoints', 'password'],
  permissions: ['background', 'noNotifications', 'photoAccess'],
};

/** "Sık sorulanlar", in the design's order. */
export const FREQUENT_QUESTIONS: readonly HelpQuestion[] = [
  'stopped',
  'shareRide',
  'visibility',
  'gpsDrift',
];

export const ALL_QUESTIONS: readonly HelpQuestion[] = HELP_CATEGORIES.flatMap(
  (category) => HELP_QUESTIONS[category],
);

export const isHelpCategory = (value: string): value is HelpCategory =>
  (HELP_CATEGORIES as readonly string[]).includes(value);

export const isHelpQuestion = (value: string): value is HelpQuestion =>
  (ALL_QUESTIONS as readonly string[]).includes(value);
