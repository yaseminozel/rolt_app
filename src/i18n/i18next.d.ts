import 'i18next';

import type { trResources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof trResources;
  }
}
