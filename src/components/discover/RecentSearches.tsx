import { Xmark } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

type RecentSearchesProps = {
  queries: readonly string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
};

const CHIP_HEIGHT = 32;
const REMOVE_ICON_SIZE = 16;

/**
 * "Son aramalar" (01.1 Search — Active, `BtNZ1`): header with "Temizle" and a scrolling row
 * of recent queries; tapping a chip searches again, its × removes it.
 */
export function RecentSearches({ queries, onSelect, onRemove, onClear }: RecentSearchesProps) {
  const { t } = useTranslation('discover');

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t('search.recentTitle')}
        </Text>
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          hitSlop={{ top: spacing.md, bottom: spacing.md, left: spacing.sm, right: spacing.sm }}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.clear}>{t('search.clearRecent')}</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.chips}>
        {queries.map((query) => (
          <View key={query} style={styles.chip}>
            <Pressable
              onPress={() => onSelect(query)}
              accessibilityRole="button"
              hitSlop={{ top: 6, bottom: 6 }}
              style={({ pressed }) => [styles.chipLabelArea, pressed && styles.pressed]}>
              <Text style={styles.chipLabel} numberOfLines={1}>
                {query}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onRemove(query)}
              accessibilityRole="button"
              accessibilityLabel={t('search.removeRecentA11y', { query })}
              hitSlop={{ top: 6, bottom: 6, left: spacing.xs, right: spacing.xs }}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
              <Xmark width={REMOVE_ICON_SIZE} height={REMOVE_ICON_SIZE} color={colors.textTertiary} strokeWidth={1.5} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.bodyLargeMedium,
    color: colors.textPrimary,
  },
  clear: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
  scroll: {
    marginHorizontal: -layout.screenGutter,
    flexGrow: 0,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  chip: {
    height: CHIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipLabelArea: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  chipLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  remove: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
  },
});
