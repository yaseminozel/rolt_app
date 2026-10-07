import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { isHelpQuestion } from '@/features/settings/helpCenter';
import { colors, fontFamily, layout, spacing } from '@/theme';

/** One help answer (not drawn: question as heading, answer text, a way to write to us). */
export default function HelpQuestionScreen() {
  const { t } = useTranslation('settings');
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  if (!isHelpQuestion(id)) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.question} accessibilityRole="header">
          {t(`help.questions.${id}.q`)}
        </Text>
        <Text style={styles.answer}>{t(`help.questions.${id}.a`)}</Text>
        <Button
          variant="outlined"
          label={t('help.contact')}
          onPress={() => router.push('/settings/feedback')}
          style={styles.contact}
        />
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
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  question: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  answer: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  contact: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
});
