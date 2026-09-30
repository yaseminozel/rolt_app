import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

/**
 * Primary navigation (Pencil "Navigation Bar / Floating", I3pOq).
 * Rendered natively so iOS 26 draws it with Liquid Glass; the design's
 * Iconoir map / play / user icons map to SF Symbols and Material Symbols.
 */
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.textPrimary}>
      <NativeTabs.Trigger name="discover">
        <NativeTabs.Trigger.Icon sf="map" md="map" />
        <NativeTabs.Trigger.Label>Keşfet</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="record">
        <NativeTabs.Trigger.Icon sf="play" md="play_arrow" />
        <NativeTabs.Trigger.Label>Kaydet</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person" md="person" />
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
