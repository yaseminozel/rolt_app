import { router, Stack } from 'expo-router';
import { ChatLines } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusIcon } from '@/components/feedback/StatusIcon';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { formatNumber } from '@/i18n/format';
import {
  ALL_QUESTIONS,
  FREQUENT_QUESTIONS,
  HELP_CATEGORIES,
  HELP_QUESTIONS,
  type HelpQuestion,
} from '@/features/settings/helpCenter';
import { matchesSearch } from '@/lib/searchText';
import { colors, layout, spacing } from '@/theme';

/**
 * 10.12 Yardım ve SSS (Pencil `vV5hq`): question search, categories with their question count
 * and frequent questions. The design's header says "Hesap bilgileri" and its last card repeats
 * the notification settings row; the title is "Yardım ve SSS" and the last card is "Bize yaz"
 * (feedback, 10.13), the way out when no answer helps. Rows have no "Kısa açıklama satırı".
 */
export default function HelpScreen() {
  const { t } = useTranslation('settings');
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const results = trimmed
    ? ALL_QUESTIONS.filter(
        (id) =>
          matchesSearch(t(`help.questions.${id}.q`), trimmed) ||
          matchesSearch(t(`help.questions.${id}.a`), trimmed),
      )
    : null;

  const questionRow = (id: HelpQuestion) => (
    <SettingsRow
      key={id}
      label={t(`help.questions.${id}.q`)}
      trailing="chevron"
      onPress={() => router.push({ pathname: '/settings/help/question/[id]', params: { id } })}
    />
  );

  return (
    <>
      <Stack.Screen options={{ title: t('help.title') }} />
      <Stack.SearchBar
        placeholder={t('help.searchPlaceholder')}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        placement="automatic"
        allowToolbarIntegration={false}
        hideWhenScrolling={false}
        tintColor={colors.textPrimary}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag">
        {results === null ? (
          <>
            <SettingsSection title={t('help.categories')}>
              {HELP_CATEGORIES.map((category) => (
                <SettingsRow
                  key={category}
                  label={t(`help.categoryNames.${category}`)}
                  trailing="valueChevron"
                  value={formatNumber(HELP_QUESTIONS[category].length)}
                  onPress={() =>
                    router.push({ pathname: '/settings/help/[category]', params: { category } })
                  }
                />
              ))}
            </SettingsSection>
            <SettingsSection title={t('help.frequent')}>
              {FREQUENT_QUESTIONS.map(questionRow)}
            </SettingsSection>
          </>
        ) : results.length > 0 ? (
          <SettingsSection title={t('help.results', { count: results.length })}>
            {results.map(questionRow)}
          </SettingsSection>
        ) : (
          <EmptyState
            icon={<StatusIcon status="neutral" />}
            title={t('help.noResults', { query: trimmed })}
            description={t('help.noResultsHint')}
            style={styles.empty}
          />
        )}
        <View>
          <SettingsSection>
            {[
              <SettingsRow
                key="contact"
                icon={ChatLines}
                label={t('help.contact')}
                description={t('help.contactHint')}
                trailing="chevron"
                onPress={() => router.push('/settings/feedback')}
              />,
            ]}
          </SettingsSection>
        </View>
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
    gap: spacing.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  empty: {
    paddingTop: spacing.xl,
  },
});
