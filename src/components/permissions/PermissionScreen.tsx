import type { ComponentType, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { colors, layout, spacing, typography } from '@/theme';

import { PermissionBenefitRow } from './PermissionBenefitRow';

/**
 * Empty "Üst çubuk / Kayıt" bar of TJtI6 / RzQd4: its back button is transparent and "Atla"
 * is disabled, so it only reserves space and keeps the illustration where the design puts it.
 */
const TOP_BAR_HEIGHT = 64;
/** Content column padding [8, 32, 20, 32] and gap 16 ("İçerik"). */
const CONTENT_INSET = spacing.xxxl;
/** Benefit list: 14 pt between rows, 6 pt extra above the list ("Faydalar"). */
const BENEFIT_GAP = 14;
const BENEFIT_TOP = 6;
/** Primary → secondary action gap ("Alt aksiyonlar" gap 10). */
const ACTION_GAP = 10;

export type PermissionBenefit = {
  key: string;
  icon: ComponentType<SvgProps>;
  title: string;
  text: string;
};

type PermissionScreenProps = {
  /** 220 pt illustration card at the top. */
  illustration: ReactNode;
  title: string;
  description: string;
  benefits: readonly PermissionBenefit[];
  /** Optional line under the benefits (e.g. the location privacy note). */
  footnote?: ReactNode;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel: string;
  onSecondaryPress: () => void;
  /** True while the system permission dialog is open; blocks both actions. */
  busy?: boolean;
};

/**
 * Shared layout of the permission priming screens (00.13 `TJtI6`, 00.14 `RzQd4`):
 * illustration, title, description, benefit rows and an optional footnote in a scrollable
 * column, with the allow CTA and "Şimdi değil" pinned to the bottom. No header actions:
 * the design hides both back and "Atla".
 */
export function PermissionScreen({
  illustration,
  title,
  description,
  benefits,
  footnote,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  busy = false,
}: PermissionScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_BAR_HEIGHT + spacing.sm }]}>
        {illustration}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.benefits}>
          {benefits.map(({ key, ...benefit }) => (
            <PermissionBenefitRow key={key} {...benefit} />
          ))}
        </View>
        {footnote}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button label={primaryLabel} onPress={onPrimaryPress} loading={busy} size="lg" />
        <Button label={secondaryLabel} onPress={onSecondaryPress} disabled={busy} variant="text" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: CONTENT_INSET,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textBody,
  },
  benefits: {
    gap: BENEFIT_GAP,
    paddingTop: BENEFIT_TOP,
  },
  footer: {
    gap: ACTION_GAP,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
