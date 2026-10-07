import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Bell, Lock, ShieldCheck } from 'iconoir-react-native';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { markBackgroundPromptShown } from '@/features/navigation/backgroundPrompt';
import { colors, fontFamily, layout, radius, spacing } from '@/theme';

const OPTIONS = [
  { key: 'never' },
  { key: 'askNext' },
  { key: 'whileUsing', hint: 'whileUsingHint' },
  { key: 'always', hint: 'alwaysHint', selected: true },
] as const;

const BENEFITS = [
  { key: 'screenOff', Icon: Lock },
  { key: 'voice', Icon: Bell },
  { key: 'privacy', Icon: ShieldCheck },
] as const;

/**
 * 06.04 Rotayı sür / Arka plan konum izni — Ön bilgi (Pencil `fqv4C`), a form sheet shown once on
 * the first "Başla" with foreground-only access (note `E0DAxE`). The option list mirrors the iOS
 * choice and is only an illustration ("Her zaman" drawn as chosen). "Devam et" opens the system
 * prompt (06.04 `C3q3Xj` is the iOS alert itself); either answer continues to the countdown.
 */
export default function BackgroundPermissionSheet() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { t } = useTranslation('ride');
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);

  const goToCountdown = () => {
    router.back();
    router.push({ pathname: '/ride/[routeId]/countdown', params: { routeId } });
  };

  const handleContinue = async () => {
    setRequesting(true);
    await markBackgroundPromptShown();
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      // Either answer continues; the foreground-only note shows on Hazırlık afterwards.
    }
    setRequesting(false);
    goToCountdown();
  };

  const handleNotNow = async () => {
    await markBackgroundPromptShown();
    goToCountdown();
  };

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.sm }]}
      bounces={false}>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {t('backgroundPermission.title')}
        </Text>
        <Text style={styles.description}>{t('backgroundPermission.description')}</Text>
      </View>
      <View style={styles.illustration}>
        <View style={styles.options} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.optionsTitle}>{t('backgroundPermission.optionsTitle')}</Text>
          <View style={styles.card}>
            {OPTIONS.map((option, index) => (
              <Fragment key={option.key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.option}>
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{t(`backgroundPermission.options.${option.key}`)}</Text>
                    {'hint' in option ? (
                      <Text style={styles.optionHint}>{t(`backgroundPermission.options.${option.hint}`)}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.radio, 'selected' in option && styles.radioSelected]}>
                    {'selected' in option ? <View style={styles.radioDot} /> : null}
                  </View>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
        <View style={styles.benefits}>
          {BENEFITS.map(({ key, Icon }) => (
            <View key={key} style={styles.benefit}>
              <Icon width={22} height={22} color={colors.textPrimary} strokeWidth={1.5} />
              <Text style={styles.benefitLabel}>{t(`backgroundPermission.benefits.${key}`)}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        <Button label={t('backgroundPermission.continue')} onPress={handleContinue} loading={requesting} />
        <Button variant="text" label={t('backgroundPermission.notNow')} onPress={handleNotNow} disabled={requesting} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: layout.screenGutter,
  },
  heading: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  illustration: {
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  options: {
    gap: 10,
  },
  optionsTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  optionText: {
    flex: 1,
    gap: spacing.xxs,
  },
  optionLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  optionHint: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.textPrimary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textPrimary,
  },
  benefits: {
    gap: 10,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitLabel: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.lg,
  },
});
