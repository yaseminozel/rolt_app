import { ClockRotateRight, Map as MapIcon, MapPin, Position } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { highlightMatch } from '@/features/discover/highlightMatch';
import type { PlaceSuggestion } from '@/features/route-suggestion/services/types';
import type { Place } from '@/features/route-suggestion/types';
import { formatDistance } from '@/i18n/format';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';

export type CurrentLocationRow = {
  /** Reverse-geocoded address ("Moda Cd., Kadıköy"), or a hint while unknown. */
  subtitle: string;
  onPress: () => void;
  busy?: boolean;
};

export type PlaceSearchListProps = {
  /** Typed text, for the bold match in result names. */
  query: string;
  /** `null` while no search runs (fewer than 2 characters): the results section is hidden. */
  results: PlaceSuggestion[] | null;
  loading?: boolean;
  /** The last search request failed. */
  failed?: boolean;
  recentPlaces: Place[];
  /** "Mevcut konumum" row; hidden when not given. */
  currentLocation?: CurrentLocationRow | null;
  /** "Haritadan seç" row; hidden when not given. */
  onPickOnMap?: () => void;
  onSelectSuggestion: (suggestion: PlaceSuggestion) => void;
  onSelectPlace: (place: Place) => void;
  style?: StyleProp<ViewStyle>;
};

const ICON_DISC = 36;
const ICON_SIZE = 17;

/**
 * Place picker body of 04.1 "Başlangıç ara — Autocomplete" (`xySut`): shortcuts ("Mevcut
 * konumum", "Haritadan seç"), "SONUÇLAR" with the typed letters in bold, subtitle · category and
 * distance, then "SON KULLANILANLAR". Wrap it in a scroll view.
 */
export function PlaceSearchList({
  query,
  results,
  loading = false,
  failed = false,
  recentPlaces,
  currentLocation,
  onPickOnMap,
  onSelectSuggestion,
  onSelectPlace,
  style,
}: PlaceSearchListProps) {
  const { t } = useTranslation('routeSuggestion');
  const resultIds = new Set(results?.map((result) => result.id));
  const recent = recentPlaces.filter((place) => !resultIds.has(place.id));
  const hasShortcuts = Boolean(currentLocation || onPickOnMap);

  return (
    <View style={[styles.container, style]}>
      {hasShortcuts ? (
        <View>
          {currentLocation ? (
            <PlaceRow
              icon={Position}
              iconTone="brand"
              name={t('search.currentLocation')}
              subtitle={currentLocation.subtitle}
              busy={currentLocation.busy}
              onPress={currentLocation.onPress}
            />
          ) : null}
          {onPickOnMap ? (
            <PlaceRow
              icon={MapIcon}
              iconTone="strong"
              name={t('search.pickOnMap')}
              subtitle={t('search.pickOnMapHint')}
              onPress={onPickOnMap}
            />
          ) : null}
        </View>
      ) : null}
      {hasShortcuts && (results !== null || recent.length > 0) ? <View style={styles.divider} /> : null}

      {results !== null ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('search.results')}
            </Text>
            {loading ? <ActivityIndicator size="small" color={colors.textTertiary} /> : null}
          </View>
          {results.map((result) => (
            <PlaceRow
              key={result.id}
              icon={MapPin}
              name={result.name}
              query={query}
              subtitle={
                result.subtitle && result.category
                  ? t('search.resultMeta', { subtitle: result.subtitle, category: result.category })
                  : (result.subtitle ?? result.category)
              }
              trailing={result.distanceKm !== undefined ? formatDistance(result.distanceKm, 1) : undefined}
              onPress={() => onSelectSuggestion(result)}
            />
          ))}
          {!loading && results.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {failed ? t('search.searchFailed') : t('search.noResults', { query: query.trim() })}
              </Text>
              {failed ? null : <Text style={styles.emptyHint}>{t('search.noResultsHint')}</Text>}
            </View>
          ) : null}
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('search.recent')}
            </Text>
          </View>
          {recent.map((place) => (
            <PlaceRow
              key={place.id}
              icon={ClockRotateRight}
              iconTone="muted"
              name={place.name}
              subtitle={place.subtitle}
              onPress={() => onSelectPlace(place)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

type IconTone = 'brand' | 'strong' | 'body' | 'muted';

const ICON_TONES: Record<IconTone, { disc: string; icon: string }> = {
  brand: { disc: colors.brandSubtle, icon: colors.brand },
  strong: { disc: colors.surfaceMuted, icon: colors.textPrimary },
  body: { disc: colors.surfaceMuted, icon: colors.textBody },
  muted: { disc: colors.surfaceMuted, icon: colors.textSecondary },
};

type PlaceRowProps = {
  icon: ComponentType<SvgProps>;
  iconTone?: IconTone;
  name: string;
  /** Bolds the matching part of `name`. */
  query?: string;
  subtitle?: string;
  trailing?: string;
  busy?: boolean;
  onPress: () => void;
};

function PlaceRow({ icon: Icon, iconTone = 'body', name, query, subtitle, trailing, busy = false, onPress }: PlaceRowProps) {
  const tone = ICON_TONES[iconTone];
  const { before, match, after } = query ? highlightMatch(name, query) : { before: name, match: '', after: '' };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={[name, subtitle, trailing].filter(Boolean).join(', ')}
      accessibilityState={{ busy }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.iconDisc, { backgroundColor: tone.disc }]}>
        {busy ? (
          <ActivityIndicator size="small" color={tone.icon} />
        ) : (
          <Icon width={ICON_SIZE} height={ICON_SIZE} color={tone.icon} strokeWidth={1.8} />
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {before}
          {match ? <Text style={styles.nameMatch}>{match}</Text> : null}
          {after}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 13,
  },
  sectionTitle: {
    ...typography.eyebrow,
    letterSpacing: 0.5,
    color: colors.textTertiary,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  iconDisc: {
    width: ICON_DISC,
    height: ICON_DISC,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  nameMatch: {
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    ...typography.caption,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  trailing: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  empty: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  emptyHint: {
    ...typography.callout,
    color: colors.textSecondary,
  },
});
