import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enDiscover from './locales/en/discover.json';
import enExplore from './locales/en/explore.json';
import enGarage from './locales/en/garage.json';
import enPermissions from './locales/en/permissions.json';
import enProfile from './locales/en/profile.json';
import enRegistration from './locales/en/registration.json';
import enRides from './locales/en/rides.json';
import enRouteDetail from './locales/en/routeDetail.json';
import enRoutes from './locales/en/routes.json';
import trAuth from './locales/tr/auth.json';
import trCommon from './locales/tr/common.json';
import trDiscover from './locales/tr/discover.json';
import trExplore from './locales/tr/explore.json';
import trGarage from './locales/tr/garage.json';
import trPermissions from './locales/tr/permissions.json';
import trProfile from './locales/tr/profile.json';
import trRegistration from './locales/tr/registration.json';
import trRides from './locales/tr/rides.json';
import trRouteDetail from './locales/tr/routeDetail.json';
import trRoutes from './locales/tr/routes.json';

import type { AppLanguage } from './language';

/** Turkish is the source of truth; every other language must provide the same keys. */
export const trResources = {
  common: trCommon,
  auth: trAuth,
  registration: trRegistration,
  permissions: trPermissions,
  rides: trRides,
  routes: trRoutes,
  discover: trDiscover,
  routeDetail: trRouteDetail,
  explore: trExplore,
  garage: trGarage,
  profile: trProfile,
};

type LocaleResources = typeof trResources;

const enResources: LocaleResources = {
  common: enCommon,
  auth: enAuth,
  registration: enRegistration,
  permissions: enPermissions,
  rides: enRides,
  routes: enRoutes,
  discover: enDiscover,
  routeDetail: enRouteDetail,
  explore: enExplore,
  garage: enGarage,
  profile: enProfile,
};

export const resources: Record<AppLanguage, LocaleResources> = {
  tr: trResources,
  en: enResources,
};

export const NAMESPACES = Object.keys(trResources) as (keyof LocaleResources)[];
