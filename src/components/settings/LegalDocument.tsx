import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, spacing } from '@/theme';

type LegalSection = { title: string; paragraphs: string[] };

/**
 * Privacy policy / terms of use (10.14 `Bi1d5`, 10.15 `UbBhh`): title, last update, intro and
 * numbered sections. The design shows them in an in-app browser on the website; until
 * roltapp.com hosts them the same text is rendered natively.
 */
export function LegalDocument({ document }: { document: 'privacy' | 'terms' }) {
  const { t } = useTranslation('settings');
  const insets = useSafeAreaInsets();
  const sections = t(`legal.${document}.sections`, { returnObjects: true }) as LegalSection[];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {t(`legal.${document}.title`)}
        </Text>
        <Text style={styles.updated}>
          {t('legal.lastUpdated', { date: t(`legal.${document}.updated`) })}
        </Text>
      </View>
      <Text style={styles.paragraph}>{t(`legal.${document}.intro`)}</Text>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {section.title}
          </Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  heading: {
    gap: spacing.xxs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
  },
  updated: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  paragraph: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
  },
});
