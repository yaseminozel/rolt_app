import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { TabBarVisibilityProvider } from '@/components/layout/TabBarVisibility';
import { RideAccessory } from '@/components/record/RideAccessory';
import { usePermissionPromptSheet } from '@/features/auth/usePermissionPromptSheet';
import { rememberTab } from '@/features/rides/recordSheet';
import { useRideRecording } from '@/features/rides/RideRecordingProvider';
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
 * and icons come from the design. Kaydet opens the record sheet (`/record-ride`, Pencil `w90Kk`)
 * over the current tab instead of switching to a tab of its own.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  // Normally answered during registration; catches a sheet still due after it (e.g. app killed).
  usePermissionPromptSheet();
  const { active } = useRideRecording();

  return (
    <TabBarVisibilityProvider>
      {(hidden) => (
        <NativeTabs
          tintColor={colors.textPrimary}
          hidden={hidden}
          screenListeners={({ route }) => ({ focus: () => rememberTab(route.name) })}>
          {/* A ride still recording with the sheet closed shows above the tab bar (iOS 26). */}
          {active ? (
            <NativeTabs.BottomAccessory>
              <RideAccessory recording={active} />
            </NativeTabs.BottomAccessory>
          ) : null}
          <NativeTabs.Trigger name="discover">
            <NativeTabs.Trigger.Icon src={icons.discover} />
            <NativeTabs.Trigger.Label>{t('tabs.discover')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          {/* Kaydet opens the record sheet instead of switching tabs. iOS keeps the current tab
              (`disabled`; the press still arrives as `tabPress`); Android selects the tab, whose
              screen hands over to the sheet. */}
          <NativeTabs.Trigger
            name="record"
            disabled
            listeners={{
              tabPress: () => {
                if (Platform.OS === 'ios') {
                  router.push('/record-ride');
                }
              },
            }}>
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
