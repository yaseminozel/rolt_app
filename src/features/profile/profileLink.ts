/** Public profile address (09.02; the design's "moto.app" placeholder is ROLT's own domain). */
const PROFILE_HOST = 'roltapp.com';

export const profileLink = (handle: string) => `https://${PROFILE_HOST}/u/${handle}`;
/** Shown without the scheme, as in the design ("…/u/yaseminozel"). */
export const profileLinkLabel = (handle: string) => `${PROFILE_HOST}/u/${handle}`;
