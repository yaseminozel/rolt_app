import { router, useLocalSearchParams } from 'expo-router';
import { Clock, Map as MapIcon, NavArrowLeft, NavArrowRight, Xmark } from 'iconoir-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StopSuggestionRow, type DetourTone } from '@/components/navigation/StopSuggestionRow';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchField } from '@/components/ui/SearchField';
import { useDebouncedValue } from '@/features/discover/useDebouncedValue';
import { cumulativeDistances, projectOnLine, sliceLine } from '@/features/navigation/geometry';
import { useRideSession } from '@/features/navigation/RideSessionProvider';
import { placeOnRide, rideLine } from '@/features/navigation/ridePlan';
import { STOP_CATEGORIES, stopSearch, type StopCandidate, type StopCategory } from '@/features/navigation/stops';
import {
  addRecentStopSearch,
  clearRecentStopSearches,
  removeRecentStopSearch,
  useRecentStopSearches,
} from '@/features/navigation/stops/recentStopSearches';
import { formatNumber } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing } from '@/theme';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type Suggestion = {
  candidate: StopCandidate;
  alongM: number;
  detail: string;
  badge: { label: string; tone: DetourTone };
};

/**
 * 06.02 Rotayı sür / Durak ekle — Arama (Pencil `wozjI`), a form sheet over Hazırlık: search,
 * category chips, "Haritadan seç", recent searches (≤ 5) and "ROTA BOYUNCA" in route order with
 * the deviation of each place. Picking one opens the preview (06.03); no results suggest the map.
 */
export default function AddStopSheet() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { t } = useTranslation('ride');
  const insets = useSafeAreaInsets();
  const { route, reversed, plan, hasApproach, setPendingStop } = useRideSession();
  const recent = useRecentStopSearches();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StopCategory | null>(null);
  const [response, setResponse] = useState<{ key: string; results: StopCandidate[]; failed: boolean } | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const searching = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const line = useMemo(() => rideLine(route, reversed), [route, reversed]);
  const approachLine = useMemo(() => {
    if (!hasApproach || !plan) {
      return null;
    }
    const joinM = projectOnLine(line[0], plan.geometry, plan.cumulativeM).alongM;
    return sliceLine(plan.geometry, plan.cumulativeM, 0, joinM);
  }, [hasApproach, line, plan]);

  const requestKey = searching ? `q:${debouncedQuery}` : `c:${category ?? 'all'}`;
  const results = response?.key === requestKey ? response.results : null;
  const failed = response?.key === requestKey && response.failed;

  useEffect(() => {
    let cancelled = false;
    const request = searching
      ? stopSearch.search({ query: debouncedQuery, line })
      : stopSearch.alongRoute({ line, category });
    request
      .then((found) => {
        if (!cancelled) {
          setResponse({ key: requestKey, results: found, failed: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResponse({ key: requestKey, results: [], failed: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category, debouncedQuery, line, requestKey, searching]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!results) {
      return [];
    }
    const lineLength = cumulativeDistances(line).at(-1) ?? 0;
    return results
      .filter((candidate) => !searching || category === null || candidate.category === category)
      .map((candidate) => {
        const placement = placeOnRide(candidate.coordinates, line, approachLine);
        const km = formatNumber(Math.min(placement.alongM, lineLength) / 1000, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
        const detail = placement.onApproach
          ? t('addStop.placement.approach')
          : t(`addStop.placement.${placement.proximity}`, { km });
        const minutes = Math.max(1, placement.detourMinutes);
        const badge =
          placement.proximity === 'onRoute' && placement.detourMinutes === 0 && !placement.onApproach
            ? { label: t('addStop.badgeOnRoute'), tone: 'onRoute' as const }
            : {
                label: t('addStop.badgeMinutes', { minutes }),
                tone: placement.proximity === 'farFromRoute' ? ('far' as const) : ('neutral' as const),
              };
        return { candidate, alongM: placement.onApproach ? -1 : placement.alongM, detail, badge };
      })
      .sort((a, b) => a.alongM - b.alongM);
  }, [approachLine, category, line, results, searching, t]);

  const close = () => router.back();

  const choose = (candidate: StopCandidate) => {
    if (query.trim()) {
      addRecentStopSearch(query);
    }
    setPendingStop(candidate);
    router.back();
    router.push({ pathname: '/ride/[routeId]/stop-preview', params: { routeId } });
  };

  const pickOnMap = () => {
    router.back();
    router.push({ pathname: '/ride/[routeId]/pick-on-map', params: { routeId } });
  };

  return (
    <>
      <View collapsable={false} style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('addStop.back')}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <NavArrowLeft width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {t('addStop.title')}
          </Text>
        </View>
        <SearchField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder={t('addStop.searchPlaceholder')}
          returnKeyType="search"
          onSubmitEditing={() => addRecentStopSearch(query)}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}>
          <FilterChip type="toggle" showIcon={false} label={t('addStop.categories.all')} selected={category === null} onPress={() => setCategory(null)} />
          {STOP_CATEGORIES.map((item) => (
            <FilterChip
              key={item}
              type="toggle"
              showIcon={false}
              label={t(`addStop.categories.${item}`)}
              selected={category === item}
              onPress={() => setCategory(category === item ? null : item)}
            />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets>
        <Pressable
          onPress={pickOnMap}
          accessibilityRole="button"
          style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}>
          <View style={styles.pickIcon}>
            <MapIcon width={20} height={20} color={colors.brand} strokeWidth={1.5} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.pickTitle}>{t('addStop.pickOnMap')}</Text>
            <Text style={styles.detail}>{t('addStop.pickOnMapHint')}</Text>
          </View>
          <NavArrowRight width={18} height={18} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>

        {!searching && recent.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('addStop.recentTitle')}</Text>
              <Pressable onPress={clearRecentStopSearches} accessibilityRole="button" hitSlop={spacing.md}>
                <Text style={styles.clear}>{t('addStop.clearRecent')}</Text>
              </Pressable>
            </View>
            {recent.map((item) => (
              <View key={item} style={styles.recentRow}>
                <Pressable onPress={() => setQuery(item)} accessibilityRole="button" style={styles.recentMain}>
                  <View style={styles.recentIcon}>
                    <Clock width={20} height={20} color={colors.textSecondary} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.recentLabel} numberOfLines={1}>
                    {item}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeRecentStopSearch(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t('addStop.removeRecentA11y', { query: item })}
                  hitSlop={spacing.md}
                  style={styles.recentRemove}>
                  <Xmark width={14} height={14} color={colors.textSecondary} strokeWidth={1.8} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addStop.alongRouteTitle')}</Text>
          {results === null ? (
            <ActivityIndicator color={colors.textSecondary} style={styles.loading} />
          ) : suggestions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{failed ? t('addStop.searchError') : t('addStop.noResults')}</Text>
              {failed ? null : <Text style={styles.detail}>{t('addStop.noResultsHint')}</Text>}
            </View>
          ) : (
            suggestions.map((suggestion) => (
              <StopSuggestionRow
                key={suggestion.candidate.id}
                name={suggestion.candidate.name}
                detail={suggestion.detail}
                category={suggestion.candidate.category}
                badge={suggestion.badge}
                onPress={() => choose(suggestion.candidate)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.md,
  },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  chipsScroll: {
    flexGrow: 0,
    marginHorizontal: -layout.screenGutter,
  },
  chips: {
    gap: spacing.sm,
    paddingTop: 14,
    paddingBottom: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  list: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listContent: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenGutter,
  },
  pickRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  pickIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoSubtle,
  },
  flex: {
    flex: 1,
  },
  pickTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.brand,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  section: {
    gap: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.72,
    color: colors.textSecondary,
  },
  clear: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 16,
    color: colors.brand,
  },
  recentRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  recentIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentLabel: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  recentRemove: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    paddingVertical: spacing.xxl,
  },
  empty: {
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
