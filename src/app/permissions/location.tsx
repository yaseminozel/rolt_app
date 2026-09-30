import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Group, MapPin, PathArrow, ShieldCheck } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { LocationPreviewCard } from '@/components/permissions/LocationPreviewCard';
import { PermissionScreen, type PermissionBenefit } from '@/components/permissions/PermissionScreen';
import { colors, spacing, typography } from '@/theme';

const PRIVACY_ICON_SIZE = 14;

/**
 * 00.13 İzin / Konum (Pencil `TJtI6`), shown once right after registration.
 * "Konum iznini ver" asks for foreground location only (background access is requested
 * later by the Record flow); whatever the answer — like "Şimdi değil" — the flow moves on
 * to 00.14. `replace` keeps this screen out of the history (no back in the design).
 */
export default function LocationPermissionScreen() {
  const { t } = useTranslation('permissions');
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const goToNotifications = () => router.replace('/permissions/notifications');

  const handleAllow = async () => {
    setRequesting(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // A failed request is treated like "not now"; Record asks again when it needs location.
    }
    goToNotifications();
  };

  const benefits: PermissionBenefit[] = [
    {
      key: 'recordRides',
      icon: PathArrow,
      title: t('location.benefits.recordRides.title'),
      text: t('location.benefits.recordRides.text'),
    },
    {
      key: 'nearbyRoutes',
      icon: MapPin,
      title: t('location.benefits.nearbyRoutes.title'),
      text: t('location.benefits.nearbyRoutes.text'),
    },
    {
      key: 'matchRiders',
      icon: Group,
      title: t('location.benefits.matchRiders.title'),
      text: t('location.benefits.matchRiders.text'),
    },
  ];

  return (
    <PermissionScreen
      illustration={<LocationPreviewCard />}
      title={t('location.title')}
      description={t('location.description')}
      benefits={benefits}
      footnote={
        <View style={styles.privacyNote}>
          <ShieldCheck
            width={PRIVACY_ICON_SIZE}
            height={PRIVACY_ICON_SIZE}
            color={colors.success}
            strokeWidth={1.5}
          />
          <Text style={styles.privacyText}>{t('location.privacyNote')}</Text>
        </View>
      }
      primaryLabel={t('location.allow')}
      onPrimaryPress={handleAllow}
      secondaryLabel={t('notNow')}
      onSecondaryPress={goToNotifications}
      busy={requesting}
    />
  );
}

const styles = StyleSheet.create({
  // "Gizlilik notu": 14 pt shield + 12 pt medium green text, 8 pt gap.
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  privacyText: {
    ...typography.captionMedium,
    flex: 1,
    color: colors.success,
  },
});
