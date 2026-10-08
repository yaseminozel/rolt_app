import { router } from 'expo-router';
import { NavArrowLeft } from 'iconoir-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecentQueryRow, SearchResultRow } from '@/components/community/SearchResultRow';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchField } from '@/components/ui/SearchField';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import {
  SUGGEST_MIN_LENGTH,
  useCommunitySearch,
  useCommunitySuggestions,
} from '@/features/community/queries';
import { useCommunityRecentSearches } from '@/features/community/recentSearches';
import type { SearchKind, SearchResult } from '@/features/community/types';
import { useSetFollowing } from '@/features/riders/queries';
import { formatNumber } from '@/i18n/format';
import { colors, layout, radius, spacing, typography } from '@/theme';

type Tab = 'all' | SearchKind;
const TABS: readonly Tab[] = ['all', 'rider', 'ride', 'place'];
/** "Tümü" shows the first two of each group (note `1005:39832`). */
const GROUP_PREVIEW = 2;

/**
 * 13.04 Topluluk / Arama (Figma `1005:39671` opened, `1005:39714` typing, `1005:39756` results,
 * `1005:39796` no results): recent searches while empty, up to four mixed suggestions from two
 * characters, then results grouped by riders, shared rides and places with type chips. Only
 * public rides are found. Back closes the search and keeps the feed where it was.
 */
export default function CommunitySearchScreen() {
  const { t } = useTranslation('community');
  const insets = useSafeAreaInsets();
  const recent = useCommunityRecentSearches();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const suggestions = useCommunitySuggestions(submitted ? '' : query);
  const results = useCommunitySearch(submitted);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setQuery(trimmed);
    setSubmitted(trimmed);
    recent.add({ type: 'query', query: trimmed });
  };

  const open = (result: SearchResult) => {
    recent.add({ type: 'result', result });
    if (result.kind === 'rider') {
      router.push({ pathname: '/rider/[id]', params: { id: result.id } });
    } else if (result.kind === 'ride') {
      router.push({ pathname: '/community/comments', params: { postId: result.postId } });
    } else {
      submit(result.name);
    }
  };

  const onChangeText = (text: string) => {
    setQuery(text);
    setSubmitted('');
    setTab('all');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('search.close')}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <NavArrowLeft width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
        <SearchField
          value={query}
          onChangeText={onChangeText}
          onClear={() => onChangeText('')}
          placeholder={t('search.placeholder')}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => submit(query)}
          containerStyle={styles.field}
        />
      </View>

      {submitted ? (
        <Results query={submitted} tab={tab} onTab={setTab} results={results.data} loading={results.isPending} onOpen={open} />
      ) : query.trim().length >= SUGGEST_MIN_LENGTH ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          <Text style={styles.groupTitle}>{t('search.suggestions')}</Text>
          {(suggestions.data ?? []).map((result) => (
            <SearchResultRow
              key={`${result.kind}-${result.kind === 'ride' ? result.postId : result.id}`}
              result={result}
              query={query.trim()}
              onPress={() => open(result)}
            />
          ))}
          <Pressable
            onPress={() => submit(query)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
            <Text style={styles.seeAllLabel}>{t('search.seeAll', { query: query.trim() })}</Text>
          </Pressable>
        </ScrollView>
      ) : recent.items.length > 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{t('search.recent')}</Text>
            <Pressable onPress={recent.clear} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.link}>{t('search.clearRecent')}</Text>
            </Pressable>
          </View>
          {recent.items.map((item) =>
            item.type === 'query' ? (
              <RecentQueryRow
                key={recent.keyOf(item)}
                query={item.query}
                onPress={() => submit(item.query)}
                onRemove={() => recent.remove(item)}
              />
            ) : (
              <SearchResultRow
                key={recent.keyOf(item)}
                result={item.result}
                onPress={() => open(item.result)}
                onRemove={() => recent.remove(item)}
              />
            ),
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Results({
  query,
  tab,
  onTab,
  results,
  loading,
  onOpen,
}: {
  query: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  results: SearchResult[] | undefined;
  loading: boolean;
  onOpen: (result: SearchResult) => void;
}) {
  const { t } = useTranslation('community');
  const requireAccount = useRequireAccount();
  const setFollowing = useSetFollowing();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const all = results ?? [];
    return {
      rider: all.filter((item) => item.kind === 'rider'),
      ride: all.filter((item) => item.kind === 'ride'),
      place: all.filter((item) => item.kind === 'place'),
    };
  }, [results]);

  const followButton = (result: SearchResult) => {
    if (result.kind !== 'rider') {
      return undefined;
    }
    const following = followed[result.id] ?? result.isFollowing;
    return (
      <Button
        variant={following ? 'outlined' : 'contained'}
        label={following ? t('search.following') : t('search.follow')}
        onPress={() =>
          requireAccount('followRider', () => {
            setFollowed((current) => ({ ...current, [result.id]: !following }));
            setFollowing.mutate({ riderId: result.id, following: !following });
          })
        }
        style={styles.follow}
      />
    );
  };

  const kinds: SearchKind[] = tab === 'all' ? ['rider', 'ride', 'place'] : [tab];
  const empty = !loading && (results?.length ?? 0) === 0;

  return (
    <View style={styles.flex}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}>
        {TABS.map((item) => (
          <FilterChip
            key={item}
            type="toggle"
            label={t(`search.tabs.${item}`)}
            selected={tab === item}
            showIcon={false}
            onPress={() => onTab(item)}
          />
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : empty ? (
        <View style={styles.empty}>
          <EmptyState
            title={t('search.noResults.title', { query })}
            description={t('search.noResults.description')}
          />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {kinds.map((kind) => {
            const items = groups[kind];
            if (items.length === 0) {
              return null;
            }
            const shown = tab === 'all' ? items.slice(0, GROUP_PREVIEW) : items;
            return (
              <View key={kind} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{t(`search.groups.${kind}`)}</Text>
                  {tab === 'all' ? (
                    <Pressable onPress={() => onTab(kind)} accessibilityRole="button" hitSlop={12}>
                      <Text style={styles.link}>
                        {t('search.allCount', { value: formatNumber(items.length) })}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {shown.map((result) => (
                  <SearchResultRow
                    key={`${result.kind}-${result.kind === 'ride' ? result.postId : result.id}`}
                    result={result}
                    query={query}
                    onPress={() => onOpen(result)}
                    trailing={followButton(result) ?? (result.kind === 'ride' ? <View /> : undefined)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: layout.screenGutter,
    paddingBottom: spacing.sm,
  },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  field: {
    flex: 1,
  },
  list: {
    paddingBottom: spacing.xxxl,
  },
  group: {
    paddingTop: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  groupTitle: {
    ...typography.bodyLargeSemibold,
    lineHeight: 22,
    color: colors.textPrimary,
    paddingHorizontal: 0,
  },
  link: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  seeAll: {
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.lg,
  },
  seeAllLabel: {
    ...typography.bodyMedium,
    color: colors.brand,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabs: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.xxxl,
  },
  empty: {
    paddingTop: 96,
    paddingHorizontal: layout.screenGutter,
  },
  follow: {
    minWidth: 96,
  },
});
