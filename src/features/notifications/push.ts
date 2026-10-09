import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/i18n';
import { deviceStore } from '@/lib/deviceStore';
import { currentUserId, hasSupabase, supabase, unwrap } from '@/lib/supabase/client';
import { colors } from '@/theme';

/**
 * Remote pushes need a development / store build on a phone: not the web preview, not Expo Go
 * (no remote notifications on Android since SDK 53). Simulators fail to get a token and are
 * skipped by the try/catch in `registerPushToken`.
 */
export const pushSupported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * Android channels; the `push` edge function sends social pushes (likes, comments, followers,
 * messages) to `social` and everything else to `default` (also the FCM default channel in
 * app.json). Names are shown in the phone's notification settings, so they are translated.
 */
export const ANDROID_CHANNELS = { default: 'default', social: 'social' } as const;

const TOKEN_KEY = 'rolt.push.token';
/** A token a sign-out couldn't remove (offline); forgotten later. */
const PENDING_FORGET_KEY = 'rolt.push.pendingForget';

export async function ensureAndroidChannels() {
  if (Platform.OS !== 'android' || !pushSupported) {
    return;
  }
  await Promise.all([
    Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.default, {
      name: i18n.t('notifications:channels.default'),
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: colors.brand,
    }),
    Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.social, {
      name: i18n.t('notifications:channels.social'),
      description: i18n.t('notifications:channels.socialDescription'),
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.brand,
    }),
  ]).catch(() => undefined);
}

/** Pushes arriving while the app is open show as a banner too (the list updates over Realtime). */
export function configureForegroundPresentation() {
  if (!pushSupported) {
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      // The badge follows the unread count of the list (`useLiveNotifications`).
      shouldSetBadge: false,
    }),
  });
}

/** `${userId}:${token}` registered in this run; registration is repeated only when it changes. */
let registered: string | null = null;
let registering: Promise<void> | null = null;

async function register(force: boolean) {
  if (!hasSupabase || !pushSupported) {
    return;
  }
  await forgetPendingPushToken();
  const userId = await currentUserId();
  if (!userId) {
    return;
  }
  // Asked by the permission sheet (03.02) or turned on in the phone's settings (10.09); never here.
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    return;
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  let token: string;
  try {
    await ensureAndroidChannels();
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    // Simulator without APNs, no Google Play services, offline: try again next time.
    if (__DEV__) {
      console.warn('push token unavailable', error);
    }
    return;
  }
  const key = `${userId}:${token}`;
  if (!force && registered === key) {
    return;
  }
  unwrap(
    await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS,
      p_device_name: Constants.deviceName ?? undefined,
    }),
  );
  registered = key;
  await deviceStore.set(TOKEN_KEY, token);
}

/**
 * Registers this phone's Expo push token for the signed-in rider (`register_push_token` moves it
 * from another account). Runs after sign-in, at app start and whenever the app comes to the
 * foreground (permission may have been granted meanwhile); a no-op without permission.
 */
export function registerPushToken({ force = false } = {}) {
  registering ??= register(force)
    .catch((error) => {
      if (__DEV__) {
        console.warn('push token registration failed', error);
      }
    })
    .finally(() => {
      registering = null;
    });
  return registering;
}

/**
 * Before signing out (the session is still valid): this phone stops getting the rider's pushes
 * and the icon badge is cleared.
 */
export async function unregisterPushToken() {
  registered = null;
  if (!pushSupported) {
    return;
  }
  await Notifications.setBadgeCountAsync(0).catch(() => undefined);
  const token = await deviceStore.get(TOKEN_KEY);
  if (!hasSupabase || !token) {
    return;
  }
  await deviceStore.remove(TOKEN_KEY);
  try {
    unwrap(await supabase.rpc('forget_push_token', { p_token: token }));
  } catch {
    // Offline: the signed-out account must not keep getting pushes on this phone. The token is
    // forgotten (no session needed) the next time the app is online.
    await deviceStore.set(PENDING_FORGET_KEY, token);
  }
}

/** Removes a token left behind by a sign-out without connection. */
export async function forgetPendingPushToken() {
  const token = await deviceStore.get(PENDING_FORGET_KEY);
  if (!hasSupabase || !token) {
    return;
  }
  const { error } = await supabase.rpc('forget_push_token', { p_token: token });
  if (!error) {
    await deviceStore.remove(PENDING_FORGET_KEY);
  }
}

/** The icon badge (iOS, some Android launchers) shows the unread notification count. */
export function setAppBadge(count: number) {
  if (!pushSupported) {
    return;
  }
  Notifications.setBadgeCountAsync(count).catch(() => undefined);
}
