import * as Notifications from 'expo-notifications';

import { onAfterSignIn, onBeforeSignOut } from '@/features/auth/sessionHooks';
import { syncLocaleToServer } from '@/features/settings/userSettings';
import { i18n } from '@/i18n';

import {
  configureForegroundPresentation,
  ensureAndroidChannels,
  forgetPendingPushToken,
  pushSupported,
  registerPushToken,
  unregisterPushToken,
} from './push';

/**
 * App-wide notification wiring, run once when imported (import it as early as possible, ideally
 * from the root layout): foreground banners, Android channels (they must exist before the
 * permission prompt and the push token), and the account switch: after sign-in the server learns
 * the language and this phone's push token; before sign-out the token is removed.
 */
let configured = false;

function configure() {
  if (configured) {
    return;
  }
  configured = true;
  configureForegroundPresentation();
  ensureAndroidChannels();
  // Channel names follow the interface language.
  i18n.on('languageChanged', () => {
    ensureAndroidChannels();
  });
  onAfterSignIn(async () => {
    await syncLocaleToServer();
    await registerPushToken({ force: true });
  });
  onBeforeSignOut(unregisterPushToken);
  // A sign-out without connection left this phone's token on the old account.
  forgetPendingPushToken().catch(() => undefined);
  if (pushSupported) {
    // FCM / APNs may rotate the device token; the Expo token is fetched and registered again.
    // The first token seen in a run is only remembered (fetching it may emit it), so a change
    // registers once instead of looping.
    let deviceToken: string | null = null;
    Notifications.addPushTokenListener((token) => {
      const next = String(token.data);
      if (next === deviceToken) {
        return;
      }
      const rotated = deviceToken !== null;
      deviceToken = next;
      if (rotated) {
        registerPushToken({ force: true });
      }
    });
  }
}

configure();
