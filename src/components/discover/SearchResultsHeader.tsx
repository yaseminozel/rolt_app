import { ControlSlider, Filter, NavArrowDown } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RouteSort } from '@/features/routes/types';
import { colors, radius, spacing, typography } from '@/theme';

type SearchResultsHeaderProps = {
  /** Result count; hidden while the first page loads. */
  count: number | undefined;
  sort: RouteSort;
  /** Filter groups in use; > 0 shows the count badge on "Filtrele". */
  activeFilterCount: number;
  onFilterPress: () => void;
  onSortPress: () => void;
};

const FILTER_ICON_SIZE = 16;
const SORT_ICON_SIZE = 18;
const CHEVRON_SIZE = 16;
const BADGE_SIZE = 18;
/** Vertical hit slop that brings the 18 pt controls to a 44 pt target. */
const CONTROL_HIT_SLOP = { top: 13, bottom: 13, left: spacing.xs, right: spacing.xs };

/**
 * "Sonuç başlığı" of 01.2 Search — Results (T2ku5 `E2vHj`): "8 sonuç bulundu", the
 * "Filtrele" action (filter sheet, PXcQ0) and the sort action showing the current order.
 */
export function SearchResultsHeader({
  count,
  sort,
  activeFilterCount,
  onFilterPress,
  onSortPress,
}: SearchResultsHeaderProps) {
  const { t } = useTranslation(['discover', 'routes']);
  const sortLabel = t(`routes:sort.${sort}`);

  return (
    <View style={styles.container}>
      <Text style={styles.count} accessibilityLiveRegion="polite">
        {count === undefined ? '' : t('search.resultCount', { count })}
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel={
            activeFilterCount > 0 ? t('search.filterActiveA11y', { count: activeFilterCount }) : t('search.filter')
          }
          hitSlop={CONTROL_HIT_SLOP}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <ControlSlider width={FILTER_ICON_SIZE} height={FILTER_ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
          <Text style={styles.label}>{t('search.filter')}</Text>
          {activeFilterCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={onSortPress}
          accessibilityRole="button"
          accessibilityLabel={t('search.sortA11y', { sort: sortLabel })}
          hitSlop={CONTROL_HIT_SLOP}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Filter width={SORT_ICON_SIZE} height={SORT_ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
          <Text style={styles.label}>{sortLabel}</Text>
          <NavArrowDown width={CHEVRON_SIZE} height={CHEVRON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 22,
  },
  count: {
    ...typography.bodyMedium,
    flex: 1,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  // Same dark count badge as the applied Filter Chip (iCyEV).
  badge: {
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInverse,
  },
  badgeLabel: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
});
