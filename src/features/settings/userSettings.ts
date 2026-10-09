import { i18n } from '@/i18n';
import { currentUserId, hasSupabase, requireUserId, supabase, unwrap } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

/** Columns of `user_settings` the app writes itself (the column grant allows only these). */
export type UserSettingsPatch = Pick<
  UserSettingsUpdate,
  | 'locale'
  | 'notify_likes'
  | 'notify_comments'
  | 'notify_followers'
  | 'notify_messages'
  | 'notify_route_suggestions'
  | 'notify_product_updates'
>;

/** Every profile has its settings row (created with the account), so an update is enough. */
export async function updateUserSettings(patch: UserSettingsPatch) {
  const userId = await requireUserId();
  unwrap(await supabase.from('user_settings').update(patch).eq('user_id', userId));
}

export async function fetchNotificationSettings() {
  const userId = await requireUserId();
  const row = unwrap(
    await supabase
      .from('user_settings')
      .select('notify_likes, notify_comments, notify_followers, notify_product_updates')
      .eq('user_id', userId)
      .single(),
  );
  if (!row) {
    throw new Error('No settings row');
  }
  return row;
}

/** The last locale written per account in this run, so app starts don't write it again. */
let syncedLocale: string | null = null;

/**
 * Tells the server the interface language (10.10), so the notifications, pushes and emails it
 * writes use it. Called after sign-in and on every language change; guests and offline errors
 * are ignored (the next sign-in or change retries).
 */
export async function syncLocaleToServer(language: string = i18n.language) {
  if (!hasSupabase) {
    return;
  }
  const userId = await currentUserId();
  if (!userId) {
    return;
  }
  const locale = language.split('-')[0] === 'en' ? 'en' : 'tr';
  const key = `${userId}:${locale}`;
  if (syncedLocale === key) {
    return;
  }
  try {
    await updateUserSettings({ locale });
    syncedLocale = key;
  } catch (error) {
    if (__DEV__) {
      console.warn('locale sync failed', error);
    }
  }
}
