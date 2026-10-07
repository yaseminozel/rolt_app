import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRideSession } from '@/features/navigation/RideSessionProvider';
import { colors, fontFamily, layout, radius, spacing } from '@/theme';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';

/**
 * 06.06 Rotayı sür / Navigasyon — Çıkış onayı (Pencil `VpgEM`): a form sheet over navigation.
 * "Bitir" ends route tracking; swiping the sheet away keeps navigating.
 */
export default function ExitNavigationSheet() {
  const { t } = useTranslation('ride');
  const bottomPadding = useSheetBottomPadding((bottom) => bottom + spacing.lg);
  const { requestEnd } = useRideSession();

  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {t('exit.title')}
        </Text>
        <Text style={styles.description}>{t('exit.description')}</Text>
      </View>
      <Pressable
        onPress={() => {
          requestEnd();
          router.back();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.confirm, pressed && styles.confirmPressed]}>
        <Text style={styles.confirmLabel}>{t('exit.confirm')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.xl,
    paddingTop: spacing.xxl,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
  heading: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  confirm: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  confirmPressed: {
    backgroundColor: colors.dangerText,
  },
  confirmLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textInverse,
  },
});
