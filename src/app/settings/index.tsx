import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import {
  Bell,
  ChatLines,
  EyeClosed,
  Globe,
  Group,
  HelpCircle,
  Lock,
  LogOut,
  MapPin,
  MediaImage,
  Motorcycle,
  Page,
  Ruler,
  User,
  Xmark,
} from 'iconoir-react-native';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { DialogModal } from '@/components/feedback/DialogModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusIcon } from '@/components/feedback/StatusIcon';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOwnProfile } from '@/features/profile/queries';
import { useDefaultRideVisibility } from '@/features/rides/queries';
import { usePermissionStatuses } from '@/features/settings/permissionStatus';
import { useEndpointPrivacy } from '@/features/settings/privacySettings';
import {
  FREQUENT_SETTINGS,
  type SettingsMenuItem,
  type SettingsSectionId,
} from '@/features/settings/settingsMenu';
import { matchesSearch } from '@/lib/searchText';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const SECTIONS: readonly SettingsSectionId[] = [
  'account',
  'privacy',
  'permissions',
  'app',
  'support',
  'community',
];
const WEBSITE = 'https://roltapp.com';
const INSTAGRAM = 'https://instagram.com/roltapp';

/**
 * 10.01 Ayarlar / Ana menü (Pencil `f5FmA1`, scrolled `xX1m6`, search `E6jKif`, no results
 * `SyD7J`): the native header with × and "Ayarlarda ara", grouped rows with their current values
 * (permissions read from the system), community links, "Çıkış yap" (10.17) and the version.
 * Sub pages arrive with Akış 15–18.
 */
export default function SettingsScreen() {
  const { t, i18n } = useTranslation('settings');
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [signOutVisible, setSignOutVisible] = useState(false);
  const { data: profile } = useOwnProfile();
  const { data: visibility } = useDefaultRideVisibility();
  const { data: endpoints } = useEndpointPrivacy();
  const permissions = usePermissionStatuses();

  // The React Compiler memoizes this list.
  const items = ((): SettingsMenuItem[] => {
    // Sub pages come with the next flows (Akış 15–18).
    const pending = () => undefined;
    return [
      {
        id: 'account',
        section: 'account',
        icon: User,
        label: t('items.account'),
        onPress: pending,
      },
      {
        id: 'bike',
        section: 'account',
        icon: Motorcycle,
        label: t('items.bike'),
        value: profile?.bike
          ? `${motorcycleBrandNames[profile.bike.brand]} ${profile.bike.model}`
          : t('values.noBike'),
        onPress: pending,
      },
      {
        id: 'rideVisibility',
        section: 'privacy',
        icon: Lock,
        label: t('items.rideVisibility'),
        value: visibility ? t(`values.visibility.${visibility}`) : undefined,
        onPress: pending,
      },
      {
        id: 'endpoints',
        section: 'privacy',
        icon: EyeClosed,
        label: t('items.endpoints'),
        value: endpoints
          ? t(endpoints.hidden ? 'values.endpoints.hidden' : 'values.endpoints.visible')
          : undefined,
        onPress: pending,
      },
      {
        id: 'blocked',
        section: 'privacy',
        icon: Group,
        label: t('items.blocked'),
        onPress: pending,
      },
      {
        id: 'location',
        section: 'permissions',
        icon: MapPin,
        label: t('items.location'),
        value: permissions ? t(`values.location.${permissions.location}`) : undefined,
        onPress: pending,
      },
      {
        id: 'photos',
        section: 'permissions',
        icon: MediaImage,
        label: t('items.photos'),
        value: permissions ? t(`values.photos.${permissions.photos}`) : undefined,
        onPress: pending,
      },
      {
        id: 'notifications',
        section: 'permissions',
        icon: Bell,
        label: t('items.notifications'),
        value: permissions ? t(`values.notifications.${permissions.notifications}`) : undefined,
        onPress: pending,
      },
      {
        id: 'language',
        section: 'app',
        icon: Globe,
        label: t('items.language'),
        value: t(i18n.language === 'en' ? 'values.language.en' : 'values.language.tr'),
        onPress: pending,
      },
      {
        id: 'units',
        section: 'app',
        icon: Ruler,
        label: t('items.units'),
        value: t('values.units'),
        onPress: pending,
      },
      {
        id: 'help',
        section: 'support',
        icon: HelpCircle,
        label: t('items.help'),
        onPress: pending,
      },
      {
        id: 'feedback',
        section: 'support',
        icon: ChatLines,
        label: t('items.feedback'),
        onPress: pending,
      },
      {
        id: 'privacyPolicy',
        section: 'support',
        icon: Page,
        label: t('items.privacyPolicy'),
        onPress: pending,
      },
      { id: 'terms', section: 'support', icon: Page, label: t('items.terms'), onPress: pending },
      {
        id: 'rate',
        section: 'community',
        label: t('items.rate'),
        description: t(Platform.OS === 'android' ? 'rateHint.android' : 'rateHint.ios'),
        onPress: () => {
          StoreReview.requestReview().catch(() => undefined);
        },
      },
      {
        id: 'recommend',
        section: 'community',
        label: t('items.recommend'),
        onPress: () => {
          Share.share({ message: t('recommendMessage', { link: WEBSITE }) }).catch(() => undefined);
        },
      },
      {
        id: 'instagram',
        section: 'community',
        label: t('items.instagram'),
        value: t('values.instagram'),
        onPress: () => {
          Linking.openURL(INSTAGRAM).catch(() => undefined);
        },
      },
    ];
  })();

  const trimmed = query.trim();
  const results = trimmed ? items.filter((item) => matchesSearch(item.label, trimmed)) : null;
  const frequent = items.filter((item) => FREQUENT_SETTINGS.includes(item.id));
  const help = items.find((item) => item.id === 'help')!;

  const confirmSignOut = async () => {
    setSignOutVisible(false);
    router.dismissAll();
    await signOut();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('title'),
          headerTitleAlign: 'left',
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Xmark width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
            </Pressable>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder={t('searchPlaceholder')}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        placement="automatic"
        allowToolbarIntegration={false}
        hideWhenScrolling={false}
        autoCapitalize="none"
        tintColor={colors.textPrimary}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled">
        {results === null ? (
          <>
            {SECTIONS.map((section) => (
              <Section
                key={section}
                title={t(`sections.${section}`)}
                items={items.filter((item) => item.section === section)}
              />
            ))}
            <View style={styles.card}>
              <SettingsRow
                icon={LogOut}
                label={t('items.signOut')}
                destructive
                trailing="none"
                onPress={() => setSignOutVisible(true)}
              />
            </View>
            <Text style={styles.version}>
              {t('version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
            </Text>
          </>
        ) : results.length > 0 ? (
          <Section title={t('search.results', { count: results.length })} items={results} plain />
        ) : (
          <>
            <View style={styles.noResults}>
              <EmptyState
                icon={<StatusIcon status="neutral" />}
                title={t('search.noResults', { query: trimmed })}
                description={t('search.noResultsHint')}
              />
              <Button variant="outlined" label={t('search.goToHelp')} onPress={help.onPress} />
            </View>
            <Section title={t('search.frequent')} items={frequent} plain />
          </>
        )}
      </ScrollView>

      <DialogModal
        visible={signOutVisible}
        onRequestClose={() => setSignOutVisible(false)}
        status="error"
        title={t('signOutDialog.title')}
        description={t('signOutDialog.description')}
        actionsLayout="column"
        actions={[
          <Button
            key="signOut"
            destructive
            label={t('signOutDialog.confirm')}
            onPress={confirmSignOut}
          />,
          <Button
            key="cancel"
            variant="text"
            label={t('signOutDialog.cancel')}
            onPress={() => setSignOutVisible(false)}
          />,
        ]}
      />
    </>
  );
}

/** A titled card of rows; `plain` drops the values (search results show labels only). */
function Section({
  title,
  items,
  plain = false,
}: {
  title: string;
  items: SettingsMenuItem[];
  plain?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? <View style={[styles.divider, item.icon && styles.dividerInset]} /> : null}
            {item.value && !plain ? (
              <SettingsRow
                icon={item.icon}
                label={item.label}
                description={item.description}
                trailing="valueChevron"
                value={item.value}
                onPress={item.onPress}
              />
            ) : (
              <SettingsRow
                icon={item.icon}
                label={item.label}
                description={item.description}
                trailing="chevron"
                onPress={item.onPress}
              />
            )}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...typography.eyebrow,
    lineHeight: 16,
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  // Rows with an icon start their divider under the label (16 + 20 + 12).
  dividerInset: {
    marginLeft: 48,
  },
  version: {
    ...typography.caption,
    lineHeight: 16,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  noResults: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
});
