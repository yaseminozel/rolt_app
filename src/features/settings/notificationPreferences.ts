import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { deviceStore } from '@/lib/deviceStore';
import { hasSupabase } from '@/lib/supabase/client';

import { fetchNotificationSettings, updateUserSettings, type UserSettingsPatch } from './userSettings';

/**
 * "Bildirimler" (10.09): which pushes the rider wants. Signed in, they live in `user_settings`
 * (the `push` edge function reads them); the device keeps a copy per account so the switches show
 * at once. Guests (and builds without Supabase) keep them on the device only. Messages and route
 * suggestions have no switch on the screen and keep their server default (on).
 */
export type NotificationPreferences = {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  productUpdates: boolean;
};

const KEY = 'rolt.settings.notifications';
/** As drawn: social pushes on, product updates off (same as the server defaults). */
const DEFAULTS: NotificationPreferences = {
  likes: true,
  comments: true,
  followers: true,
  productUpdates: false,
};

const COLUMNS: Record<keyof NotificationPreferences, keyof UserSettingsPatch> = {
  likes: 'notify_likes',
  comments: 'notify_comments',
  followers: 'notify_followers',
  productUpdates: 'notify_product_updates',
};

/** Server-backed only with Supabase and a session; otherwise the device copy is the source. */
const useAccountId = () => {
  const { session } = useAuth();
  return hasSupabase ? (session?.userId ?? null) : null;
};

const storageKey = (userId: string | null) => (userId ? `${KEY}.${userId}` : KEY);
const queryKey = (userId: string | null) => ['settings', 'notifications', userId ?? 'device'] as const;

function parse(raw: string | null): NotificationPreferences {
  try {
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<NotificationPreferences>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const readCached = async (userId: string | null) => parse(await deviceStore.get(storageKey(userId)));

function readCachedSync(userId: string | null) {
  try {
    return parse(deviceStore.getSync(storageKey(userId)));
  } catch {
    return DEFAULTS;
  }
}

async function read(userId: string | null): Promise<NotificationPreferences> {
  if (!userId) {
    return readCached(null);
  }
  try {
    const row = await fetchNotificationSettings();
    const next: NotificationPreferences = {
      likes: row.notify_likes,
      comments: row.notify_comments,
      followers: row.notify_followers,
      productUpdates: row.notify_product_updates,
    };
    await deviceStore.set(storageKey(userId), JSON.stringify(next));
    return next;
  } catch {
    // Offline: the last known choice.
    return readCached(userId);
  }
}

export function useNotificationPreferences() {
  const userId = useAccountId();
  return useQuery({
    queryKey: queryKey(userId),
    queryFn: () => read(userId),
    placeholderData: () => readCachedSync(userId),
  });
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  const userId = useAccountId();
  const key = queryKey(userId);
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      if (userId) {
        await updateUserSettings(
          Object.fromEntries(
            Object.entries(patch).map(([name, value]) => [
              COLUMNS[name as keyof NotificationPreferences],
              value,
            ]),
          ) as UserSettingsPatch,
        );
      }
      // The cache already holds every optimistic switch, also of toggles still in flight.
      const current = queryClient.getQueryData<NotificationPreferences>(key) ?? readCachedSync(userId);
      await deviceStore.set(storageKey(userId), JSON.stringify(current));
    },
    // Switches move at once; the server and the device copy follow (rolled back on error).
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      queryClient.setQueryData(key, { ...(previous ?? readCachedSync(userId)), ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => queryClient.setQueryData(key, context?.previous),
  });
}
