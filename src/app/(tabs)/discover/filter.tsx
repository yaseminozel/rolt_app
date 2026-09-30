import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { Button } from '@/components/ui/Button';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { Switch } from '@/components/ui/Switch';
import { useDiscoverState } from '@/features/discover/DiscoverStateProvider';
import { useRouteSearchPreview } from '@/features/routes/queries';
import {
  DISTANCE_RANGES,
  DURATION_RANGES,
  EMPTY_ROUTE_SEARCH_FILTERS,
  FILTER_DIFFICULTIES,
  FILTER_ROUTE_TAGS,
} from '@/features/routes/searchFilters';
import type { RouteSearchFilters, RouteTag } from '@/features/routes/types';
import { colors, layout, spacing, typography } from '@/theme';

/**
 * "Filtrele" sheet over the search results (01.2 Results · Filter sheet open, PXcQ0 `GBqN5`),
 * a native form sheet sized to its content. Choices are a draft: "N rotayı göster" applies them
 * (with a live count of the matching results) and closes; "Temizle" resets the draft;
 * dismissing the sheet discards it. Single-choice groups can be tapped again to deselect,
 * so every group can mean "no preference".
 */
export default function RouteFilterScreen() {
  const { t } = useTranslation(['discover', 'routes']);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { searchQuery, sort, city, searchFilters, setSearchFilters } = useDiscoverState();
  const [draft, setDraft] = useState<RouteSearchFilters>(searchFilters);
  const preview = useRouteSearchPreview(searchQuery, sort, city, draft);
  const count = preview.data?.length;

  const update = (patch: Partial<RouteSearchFilters>) => setDraft((current) => ({ ...current, ...patch }));
  const toggleTag = (tag: RouteTag) =>
    update({ tags: draft.tags.includes(tag) ? draft.tags.filter((item) => item !== tag) : [...draft.tags, tag] });

  return (
    <View style={styles.sheet}>
      <SheetHeader title={t('filterSheet.title')} style={styles.header} />

      <View style={styles.sections}>
        <FilterSection title={t('filterSheet.distance')}>
          <View accessibilityRole="radiogroup" style={styles.row}>
            {DISTANCE_RANGES.map((range) => (
              <SelectableChip
                key={range}
                role="radio"
                showCheck={false}
                label={t(`filterSheet.distanceOptions.${range}`)}
                selected={draft.distance === range}
                onPress={() => update({ distance: draft.distance === range ? null : range })}
                style={styles.equalChip}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title={t('filterSheet.duration')}>
          <View accessibilityRole="radiogroup" style={styles.row}>
            {DURATION_RANGES.map((range) => (
              <SelectableChip
                key={range}
                role="radio"
                showCheck={false}
                label={t(`filterSheet.durationOptions.${range}`)}
                selected={draft.duration === range}
                onPress={() => update({ duration: draft.duration === range ? null : range })}
                style={styles.equalChip}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title={t('filterSheet.roadType')}>
          <View style={[styles.row, styles.wrap]}>
            {FILTER_ROUTE_TAGS.map((tag) => (
              <SelectableChip
                key={tag}
                label={t(`routes:tags.${tag}`)}
                selected={draft.tags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title={t('filterSheet.difficulty')}>
          <View accessibilityRole="radiogroup" style={styles.row}>
            {FILTER_DIFFICULTIES.map((difficulty) => (
              <SelectableChip
                key={difficulty}
                role="radio"
                showCheck={false}
                label={t(`routes:difficulty.${difficulty}`)}
                selected={draft.difficulty === difficulty}
                onPress={() => update({ difficulty: draft.difficulty === difficulty ? null : difficulty })}
                style={styles.equalChip}
              />
            ))}
          </View>
        </FilterSection>

        <Pressable
          onPress={() => update({ loopOnly: !draft.loopOnly })}
          accessibilityRole="switch"
          accessibilityLabel={t('filterSheet.loopOnly')}
          accessibilityHint={t('filterSheet.loopOnlyDescription')}
          accessibilityState={{ checked: draft.loopOnly }}
          style={styles.loopRow}>
          <View style={styles.loopText}>
            <Text style={styles.sectionTitle}>{t('filterSheet.loopOnly')}</Text>
            <Text style={styles.loopDescription}>{t('filterSheet.loopOnlyDescription')}</Text>
          </View>
          {/* The row owns the interaction; the switch only shows the state. */}
          <View style={styles.decorative} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Switch tone="accent" value={draft.loopOnly} onValueChange={(loopOnly) => update({ loopOnly })} />
          </View>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button
          variant="outlined"
          size="lg"
          label={t('filterSheet.clear')}
          onPress={() => setDraft(EMPTY_ROUTE_SEARCH_FILTERS)}
        />
        <Button
          size="lg"
          label={t('filterSheet.show', { count: count ?? 0 })}
          loading={count === undefined && preview.isFetching}
          disabled={count === 0}
          onPress={() => {
            setSearchFilters(draft);
            router.back();
          }}
          style={styles.apply}
        />
      </View>
    </View>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
  },
  // The native grabber sits above the title.
  header: {
    paddingTop: spacing.lg,
  },
  sections: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrap: {
    flexWrap: 'wrap',
  },
  equalChip: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  loopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  loopText: {
    flex: 1,
    gap: spacing.xxs,
  },
  loopDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  decorative: {
    pointerEvents: 'none',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  apply: {
    flex: 1,
  },
});
