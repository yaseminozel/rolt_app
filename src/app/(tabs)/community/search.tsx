import { router } from 'expo-router';
import { NavArrowLeft } from 'iconoir-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryRow, SearchResultRow } from '@/components/community/SearchResultRow';
import { StackedCardsIllustration } from '@/components/illustrations/StackedCardsIllustration';
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
import { hapticToggle } from '@/features/haptics/haptics';
import { useSetFollowing } from '@/features/riders/queries';
import { formatNumber } from '@/i18n/format';
import { colors, fontFamily, layout, spacing } from '@/theme';

type Tab = 'all' | SearchKind;
const TABS: readonly Tab[] = ['all', 'rider', 'ride', 'place'];
/** "Tümü" shows the first two of each group (note `1005:39832`). */
const GROUP_PREVIEW = 2;

/**
 * 13.04 Topluluk / Arama (Pencil `cLyek` opened, `h3sJ5` typing, `vDoEo` results, `rUMQT` no
 * results): recent searches while empty, up to four mixed suggestions from two characters,
 * then results grouped by riders, shared rides and places; a group's "Tümü (n)" opens its tab
 * and the type chips show there and when nothing is found. Only public rides are found. Back
 * closes the search and keeps the feed where it was.
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
          hitSlop={{ top: 0, bottom: 0, left: 12, right: 8 }}
          style={({ pressed }) => [styles.back, pressed && styles.pressedText]}>
          <NavArrowLeft width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
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
          <View style={styles.section}>
            <Text style={styles.groupTitle}>{t('search.suggestions')}</Text>
            {(suggestions.data ?? []).map((result) => (
              <SearchResultRow
                key={`${result.kind}-${result.kind === 'ride' ? result.postId : result.id}`}
                result={result}
                mode="suggestion"
                onPress={() => open(result)}
              />
            ))}
            <QueryRow
              title={t('search.seeAll', { query: query.trim() })}
              onPress={() => submit(query)}
            />
          </View>
        </ScrollView>
      ) : recent.items.length > 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          <View style={styles.section}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{t('search.recent')}</Text>
              <Pressable onPress={recent.clear} accessibilityRole="button" hitSlop={12}>
                <Text style={styles.link}>{t('search.clearRecent')}</Text>
              </Pressable>
            </View>
            {recent.items.map((item) =>
              item.type === 'query' ? (
                <QueryRow
                  key={recent.keyOf(item)}
                  title={item.query}
                  subtitle={t('search.type.query')}
                  onPress={() => submit(item.query)}
                  onRemove={() => recent.remove(item)}
                />
              ) : (
                <SearchResultRow
                  key={recent.keyOf(item)}
                  result={item.result}
                  mode="recent"
                  onPress={() => open(item.result)}
                  onRemove={() => recent.remove(item)}
                />
              ),
            )}
          </View>
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

  const toggleFollow = (riderId: string, following: boolean) =>
    requireAccount('followRider', () => {
      hapticToggle(!following);
      setFollowed((current) => ({ ...current, [riderId]: !following }));
      setFollowing.mutate({ riderId, following: !following });
    });

  const kinds: SearchKind[] = tab === 'all' ? ['rider', 'ride', 'place'] : [tab];
  const empty = !loading && (results?.length ?? 0) === 0;
  const showChips = tab !== 'all' || empty;

  return (
    <View style={styles.flex}>
      {showChips ? (
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
      ) : null}
      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : empty ? (
        <View style={styles.empty}>
          <StackedCardsIllustration />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle} accessibilityRole="header">
              {t('search.noResults.title', { query })}
            </Text>
            <Text style={styles.emptyDescription}>{t('search.noResults.description')}</Text>
          </View>
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
                    mode="result"
                    onPress={() => onOpen(result)}
                    following={
                      result.kind === 'rider' ? (followed[result.id] ?? result.isFollowing) : undefined
                    }
                    onFollowPress={
                      result.kind === 'rider'
                        ? () => toggleFollow(result.id, followed[result.id] ?? result.isFollowing)
                        : undefined
                    }
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
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.lg,
  },
  back: {
    width: 24,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedText: {
    opacity: 0.6,
  },
  field: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  group: {
    gap: spacing.md,
  },
  groupHeader: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  link: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabs: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.xxxl,
  },
  // "Boş durum" (`rUMQT`): 72 pt under the chips, 24 pt between its parts.
  empty: {
    gap: spacing.xxl,
    paddingTop: 72 - spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
  emptyCopy: {
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
