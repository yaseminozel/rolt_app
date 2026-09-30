import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enGarage from './locales/en/garage.json';
import enPermissions from './locales/en/permissions.json';
import enRegistration from './locales/en/registration.json';
import enRides from './locales/en/rides.json';
import enRoutes from './locales/en/routes.json';
import trAuth from './locales/tr/auth.json';
import trCommon from './locales/tr/common.json';
import trGarage from './locales/tr/garage.json';
import trPermissions from './locales/tr/permissions.json';
import trRegistration from './locales/tr/registration.json';
import trRides from './locales/tr/rides.json';
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
  garage: trGarage,
};

type LocaleResources = typeof trResources;

const enResources: LocaleResources = {
  common: enCommon,
  auth: enAuth,
  registration: enRegistration,
  permissions: enPermissions,
  rides: enRides,
  routes: enRoutes,
  garage: enGarage,
};

export const resources: Record<AppLanguage, LocaleResources> = {
  tr: trResources,
  en: enResources,
};

export const NAMESPACES = Object.keys(trResources) as (keyof LocaleResources)[];
