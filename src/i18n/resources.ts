import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enDiscover from './locales/en/discover.json';
import enExplore from './locales/en/explore.json';
import enGarage from './locales/en/garage.json';
import enPermissions from './locales/en/permissions.json';
import enProfile from './locales/en/profile.json';
import enRegistration from './locales/en/registration.json';
import enRide from './locales/en/ride.json';
import enRides from './locales/en/rides.json';
import enRouteDetail from './locales/en/routeDetail.json';
import enRoutes from './locales/en/routes.json';
import enSettings from './locales/en/settings.json';
import enRouteSuggestion from './locales/en/routeSuggestion.json';
import enRouteSuggestionReview from './locales/en/routeSuggestionReview.json';
import enRouteSuggestionDetails from './locales/en/routeSuggestionDetails.json';
import trAuth from './locales/tr/auth.json';
import trCommon from './locales/tr/common.json';
import trDiscover from './locales/tr/discover.json';
import trExplore from './locales/tr/explore.json';
import trGarage from './locales/tr/garage.json';
import trPermissions from './locales/tr/permissions.json';
import trProfile from './locales/tr/profile.json';
import trRegistration from './locales/tr/registration.json';
import trRide from './locales/tr/ride.json';
import trRides from './locales/tr/rides.json';
import trRouteDetail from './locales/tr/routeDetail.json';
import trRoutes from './locales/tr/routes.json';
import trSettings from './locales/tr/settings.json';
import trRouteSuggestion from './locales/tr/routeSuggestion.json';
import trRouteSuggestionReview from './locales/tr/routeSuggestionReview.json';
import trRouteSuggestionDetails from './locales/tr/routeSuggestionDetails.json';

import type { AppLanguage } from './language';

/** Turkish is the source of truth; every other language must provide the same keys. */
export const trResources = {
  common: trCommon,
  auth: trAuth,
  registration: trRegistration,
  permissions: trPermissions,
  rides: trRides,
  ride: trRide,
  routes: trRoutes,
  routeSuggestion: trRouteSuggestion,
  routeSuggestionReview: trRouteSuggestionReview,
  routeSuggestionDetails: trRouteSuggestionDetails,
  discover: trDiscover,
  routeDetail: trRouteDetail,
  explore: trExplore,
  garage: trGarage,
  profile: trProfile,
  settings: trSettings,
};

type LocaleResources = typeof trResources;

const enResources: LocaleResources = {
  common: enCommon,
  auth: enAuth,
  registration: enRegistration,
  permissions: enPermissions,
  rides: enRides,
  ride: enRide,
  routes: enRoutes,
  routeSuggestion: enRouteSuggestion,
  routeSuggestionReview: enRouteSuggestionReview,
  routeSuggestionDetails: enRouteSuggestionDetails,
  discover: enDiscover,
  routeDetail: enRouteDetail,
  explore: enExplore,
  garage: enGarage,
  profile: enProfile,
  settings: enSettings,
};

export const resources: Record<AppLanguage, LocaleResources> = {
  tr: trResources,
  en: enResources,
};

export const NAMESPACES = Object.keys(trResources) as (keyof LocaleResources)[];
