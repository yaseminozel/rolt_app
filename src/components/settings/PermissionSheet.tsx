import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { colors, fontFamily, layout, radius, spacing } from '@/theme';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';

const ICON_TILE = 56;

type PermissionSheetProps = {
  icon: ComponentType<SvgProps>;
  title: string;
  description: string;
  /** e.g. "Her zaman açık". */
  value: string;
};

/**
 * Permission detail sheet (10.07 Konum izni, 10.08 Fotoğraf izni): what ROLT can access now and
 * a shortcut to the phone's settings, the only place a permission can change.
 */
export function PermissionSheet({ icon: Icon, title, description, value }: PermissionSheetProps) {
  const { t } = useTranslation('settings');
  const bottomPadding = useSheetBottomPadding((bottom) => bottom + spacing.sm);
  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
      <View style={styles.tile}>
        <Icon width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View
        style={styles.current}
        accessible
        accessibilityLabel={`${t('permission.current')}: ${value}`}>
        <Text style={styles.currentLabel}>{t('permission.current')}</Text>
        <Text style={styles.currentValue}>{value}</Text>
      </View>
      <Button
        size="lg"
        label={t('permission.openSettings')}
        onPress={() => Linking.openSettings()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    paddingTop: spacing.xxl,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
  tile: {
    width: ICON_TILE,
    height: ICON_TILE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  current: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  currentLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  currentValue: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
