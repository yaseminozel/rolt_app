import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { HELP_QUESTIONS, isHelpCategory } from '@/features/settings/helpCenter';
import { colors, layout, spacing } from '@/theme';

/** Questions of one help category (from 10.12 "Kategoriler"; the list itself isn't drawn). */
export default function HelpCategoryScreen() {
  const { t } = useTranslation('settings');
  const { category = '' } = useLocalSearchParams<{ category: string }>();
  const questions = isHelpCategory(category) ? HELP_QUESTIONS[category] : [];

  return (
    <>
      <Stack.Screen
        options={{ title: isHelpCategory(category) ? t(`help.categoryNames.${category}`) : '' }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SettingsSection>
          {questions.map((id) => (
            <SettingsRow
              key={id}
              label={t(`help.questions.${id}.q`)}
              trailing="chevron"
              onPress={() =>
                router.push({ pathname: '/settings/help/question/[id]', params: { id } })
              }
            />
          ))}
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
});
