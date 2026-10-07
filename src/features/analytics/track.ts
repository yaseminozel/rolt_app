/**
 * Product analytics events named in the design notes (e.g. onboarding note `xx2W7`).
 * No analytics backend is wired yet: events are logged in development only, so screens
 * can already report them and only this module changes when a provider is chosen.
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
};

type EventArgs<E extends keyof AnalyticsEvents> = AnalyticsEvents[E] extends undefined
  ? []
  : [properties: AnalyticsEvents[E]];

export function trackEvent<E extends keyof AnalyticsEvents>(event: E, ...args: EventArgs<E>) {
  if (__DEV__) {
    console.log('[analytics]', event, args[0] ?? '');
  }
}
