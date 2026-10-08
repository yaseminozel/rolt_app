import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';

export type SettingsSectionId =
  'account' | 'privacy' | 'permissions' | 'app' | 'support' | 'community';

export type SettingsItemId =
  | 'account'
  | 'bike'
  | 'rideVisibility'
  | 'endpoints'
  | 'blocked'
  | 'location'
  | 'photos'
  | 'notifications'
  | 'language'
  | 'units'
  | 'sensors'
  | 'help'
  | 'feedback'
  | 'privacyPolicy'
  | 'terms'
  | 'rate'
  | 'recommend'
  | 'instagram';

/** One row of the settings menu, as the screen renders it (label and value already resolved). */
export type SettingsMenuItem = {
  id: SettingsItemId;
  section: SettingsSectionId;
  icon?: ComponentType<SvgProps>;
  label: string;
  value?: string;
  description?: string;
  onPress: () => void;
};

/** "Sık kullanılanlar" under an empty settings search (10.01 `SyD7J`). */
export const FREQUENT_SETTINGS: readonly SettingsItemId[] = [
  'account',
  'notifications',
  'feedback',
];
