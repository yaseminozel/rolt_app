import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, layout, spacing, typography } from '@/theme';

type PermissionStep = 'location' | 'notifications';

const illustrations = {
  location: require('../../assets/images/permission-location.jpg'),
  notifications: require('../../assets/images/permission-notifications.jpg'),
} as const;

/** Illustration frame ("Frame 65") 361 × 384; scaled down on short screens. */
const ILLUSTRATION_ASPECT = 361 / 384;
const ILLUSTRATION_HEIGHT = 384;
const ILLUSTRATION_MAX_SCREEN_SHARE = 0.45;
/** Room the native grabber takes above the content ("Tutamaç" 16 + gap 4). */
const GRABBER_SPACE = spacing.xl;
/** Body copy 16 pt at 1.4375. */
const BODY_LINE_HEIGHT = 23;

/**
 * 03.01 Konum izni (Pencil `ylGJA`) → 03.02 Bildirim izni (`KvKqT`): a form sheet shown once
 * for a new account, before registration. "İzin ver" opens the system prompt; whatever the
 * answer — like "Şimdi değil" — the sheet moves on, and after notifications it closes.
 * Location asks for foreground access only; background access is asked by the ride flow.
 * Swiping the sheet away counts as "Şimdi değil" for both steps.
 */
export default function PermissionsSheet() {
  const { t } = useTranslation('permissions');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { finishPermissionPrompts } = useAuth();
  const [step, setStep] = useState<PermissionStep>('location');
  const [requesting, setRequesting] = useState(false);

  // Leaving the sheet any way (swipe, guard flip) ends the prompts; finishing twice is harmless.
  useEffect(
    () => navigation.addListener('beforeRemove', () => finishPermissionPrompts()),
    [finishPermissionPrompts, navigation],
  );

  const advance = () => {
    if (step === 'location') {
      setStep('notifications');
    } else {
      // The root guard drops this sheet once the prompts are finished.
      finishPermissionPrompts();
    }
  };

  const handleAllow = async () => {
    setRequesting(true);
    try {
      if (step === 'location') {
        await Location.requestForegroundPermissionsAsync();
      } else {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // A failed request counts as "not now"; the feature asks again when it needs access.
    } finally {
      setRequesting(false);
    }
    advance();
  };

  const illustrationHeight = Math.min(ILLUSTRATION_HEIGHT, height * ILLUSTRATION_MAX_SCREEN_SHARE);

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xs }]}>
      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          {t(`${step}.title`)}
        </Text>
        <Text style={styles.body}>{t(`${step}.description`)}</Text>
      </View>
      <Image
        key={step}
        source={illustrations[step]}
        style={[
          styles.illustration,
          { width: illustrationHeight * ILLUSTRATION_ASPECT, height: illustrationHeight },
        ]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.actions}>
        <Button label={t('allow')} onPress={handleAllow} loading={requesting} />
        <Button variant="text" label={t('notNow')} onPress={advance} disabled={requesting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    paddingTop: GRABBER_SPACE,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
  copy: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodyLarge,
    lineHeight: BODY_LINE_HEIGHT,
    color: colors.textSecondary,
  },
  illustration: {
    alignSelf: 'center',
  },
  actions: {
    gap: spacing.lg,
  },
});
