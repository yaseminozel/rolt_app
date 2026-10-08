import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { TabBarVisibilityProvider } from '@/components/layout/TabBarVisibility';
import { usePermissionPromptSheet } from '@/features/auth/usePermissionPromptSheet';
import { colors } from '@/theme';

/**
 * Tab icons exported from the design (Pencil `N2T9Y`: map, gauge, people, helmet) at 24 pt
 * @1x–3x. iOS renders them as template images tinted by the system. Kaydet has a second gauge
 * with the needle swung to the right: selecting the tab snaps the needle up, the native
 * stand-in for an animated icon (tab bar images can't run custom animation).
 */
const icons = {
  discover: require('../../../assets/images/tabs/discover.png'),
  record: {
    default: require('../../../assets/images/tabs/record.png'),
    selected: require('../../../assets/images/tabs/record-selected.png'),
  },
  community: require('../../../assets/images/tabs/community.png'),
  profile: require('../../../assets/images/tabs/profile.png'),
};

/**
 * Primary navigation (Pencil "Navigation Bar / Floating — MVP", `N2T9Y`): Keşfet, Kaydet,
 * Topluluk, Profil. Rendered natively so iOS 26 draws it with Liquid Glass; the order, labels
 * and icons come from the design. Record hides the bar while open (08.x frames draw none and
 * offer their own back button).
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  // Normally answered during registration; catches a sheet still due after it (e.g. app killed).
  usePermissionPromptSheet();

  return (
    <TabBarVisibilityProvider>
      {(hidden) => (
        <NativeTabs tintColor={colors.textPrimary} hidden={hidden}>
          <NativeTabs.Trigger name="discover">
            <NativeTabs.Trigger.Icon src={icons.discover} />
            <NativeTabs.Trigger.Label>{t('tabs.discover')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="record">
            <NativeTabs.Trigger.Icon src={icons.record} />
            <NativeTabs.Trigger.Label>{t('tabs.record')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="community">
            <NativeTabs.Trigger.Icon src={icons.community} />
            <NativeTabs.Trigger.Label>{t('tabs.community')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="profile">
            <NativeTabs.Trigger.Icon src={icons.profile} />
            <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        </NativeTabs>
      )}
    </TabBarVisibilityProvider>
  );
}
