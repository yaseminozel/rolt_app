import { router, useLocalSearchParams } from 'expo-router';
import { Xmark } from 'iconoir-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback/ToastProvider';
import { PlaceSearchList } from '@/components/route-builder/PlaceSearchList';
import { WaypointSearchField } from '@/components/route-builder/WaypointSearchField';
import { useDebouncedValue } from '@/features/discover/useDebouncedValue';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { getRecentPlaces } from '@/features/route-suggestion/draftStore';
import { placeShortLabel } from '@/features/route-suggestion/placeFormat';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { createSearchSessionToken, placeSearch, type PlaceSuggestion } from '@/features/route-suggestion/services';
import type { Place } from '@/features/route-suggestion/types';
import { useDiscardEmptyStop } from '@/features/route-suggestion/useDiscardEmptyStop';
import { colors, layout, radius, spacing, typography } from '@/theme';

/** Autocomplete costs a request per keystroke: wait for a pause and at least 2 characters. */
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const TOAST_OFFSET = spacing.lg;

type SearchState = { query: string; results: PlaceSuggestion[]; failed: boolean };

/**
 * 04.1 "Başlangıç ara — Autocomplete" (`xySut`), full-screen modal for one waypoint
 * (`waypointId` param): title per waypoint kind, search field with its badge, "Mevcut konumum",
 * "Haritadan seç", results and recently used places. One Search Box session per opening.
 * Closing without a choice drops a stop that was only just added.
 */
export default function WaypointSearchScreen() {
  const { t } = useTranslation(['routeSuggestion', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { waypointId } = useLocalSearchParams<{ waypointId: string }>();
  const { draft, setWaypointPlace } = useRouteSuggestion();
  const { position, locate } = useDeviceLocation();

  const waypoint = draft.waypoints.find((item) => item.id === waypointId) ?? null;
  const [sessionToken] = useState(createSearchSessionToken);
  const [recentPlaces] = useState(getRecentPlaces);
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const [search, setSearch] = useState<SearchState | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<Place | null>(null);

  // A stop added from "Ara durak ekle" is removed again when the search is left without a choice.
  const { handOff, isLeaving } = useDiscardEmptyStop(waypoint);

  // Unknown waypoint (e.g. the flow was reset): nothing to search for.
  useEffect(() => {
    if (!waypoint && !isLeaving()) {
      router.back();
    }
  }, [isLeaving, waypoint]);

  const proximity = position ?? draft.waypoints.find((item) => item.place)?.place?.coordinates;

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      return;
    }
    let cancelled = false;
    placeSearch
      .suggest(debouncedQuery, { sessionToken, proximity })
      .then((results) => !cancelled && setSearch({ query: debouncedQuery, results, failed: false }))
      .catch(() => !cancelled && setSearch({ query: debouncedQuery, results: [], failed: true }));
    return () => {
      cancelled = true;
    };
    // Proximity only biases ranking; a new fix shouldn't re-run the same query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, sessionToken]);

  // Address under "Mevcut konumum" once the position is known.
  useEffect(() => {
    if (!position) {
      return;
    }
    let cancelled = false;
    placeSearch
      .reverse(position)
      .then((place) => !cancelled && setCurrentAddress(place))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [position]);

  const choose = (place: Place) => {
    if (!waypoint) {
      return;
    }
    handOff();
    setWaypointPlace(waypoint.id, place);
    router.back();
  };

  const chooseSuggestion = async (suggestion: PlaceSuggestion) => {
    setBusy(true);
    try {
      choose(await placeSearch.retrieve(suggestion, { sessionToken }));
    } catch {
      showToast({ variant: 'failure', message: t('search.searchFailed'), bottomOffset: TOAST_OFFSET });
    } finally {
      setBusy(false);
    }
  };

  const chooseCurrentLocation = async () => {
    setLocating(true);
    try {
      const coordinates = await locate();
      if (!coordinates) {
        showToast({ variant: 'failure', message: t('search.locationUnavailable'), bottomOffset: TOAST_OFFSET });
        return;
      }
      const place = await placeSearch.reverse(coordinates).catch(() => null);
      choose(place ?? { id: 'current-location', name: t('search.currentLocation'), coordinates });
    } finally {
      setLocating(false);
    }
  };

  const pickOnMap = () => {
    if (!waypoint) {
      return;
    }
    handOff();
    router.replace({ pathname: '/suggest-route/pick-on-map', params: { waypointId: waypoint.id } });
  };

  if (!waypoint) {
    return <View style={styles.screen} />;
  }

  const searching = trimmed.length >= MIN_QUERY_LENGTH;
  const current = searching && search?.query === debouncedQuery ? search : null;
  const loading = searching && (debouncedQuery !== trimmed || search?.query !== debouncedQuery);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common:actions.close')}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
          <Xmark width={22} height={22} color={colors.textPrimary} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {t(`search.title_${waypoint.kind}`)}
        </Text>
      </View>

      <View style={styles.fieldRow}>
        <WaypointSearchField
          kind={waypoint.kind}
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          accessibilityLabel={t(`search.title_${waypoint.kind}`)}
          autoFocus
          editable={!busy}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <PlaceSearchList
          query={trimmed}
          results={searching ? (current?.results ?? search?.results ?? []) : null}
          loading={loading || busy}
          failed={current?.failed ?? false}
          recentPlaces={recentPlaces}
          currentLocation={{
            subtitle: locating
              ? t('search.currentLocationLocating')
              : currentAddress
                ? placeShortLabel(currentAddress)
                : t('search.currentLocationHint'),
            busy: locating,
            onPress: chooseCurrentLocation,
          }}
          onPickOnMap={pickOnMap}
          onSelectSuggestion={chooseSuggestion}
          onSelectPlace={choose}
        />
      </ScrollView>
    </View>
  );
}

const TOP_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  close: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  closePressed: {
    backgroundColor: colors.surfacePressed,
  },
  title: {
    ...typography.headline,
    flex: 1,
    color: colors.textPrimary,
  },
  fieldRow: {
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
});
