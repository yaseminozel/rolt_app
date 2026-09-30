import { Image } from 'expo-image';
import { ArrowUpLeft, MapPin, NavArrowRight, Search } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { highlightMatch } from '@/features/discover/highlightMatch';
import type { Place, Route } from '@/features/routes/types';
import { formatDistance } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

type SearchSuggestionsProps = {
  /** What the rider has typed, used for the bold match and the "tüm sonuçlar" row. */
  query: string;
  routes: Route[];
  places: Place[];
  onRoutePress: (route: Route) => void;
  /** The ↖ action: put the route name into the field and keep typing. */
  onRouteFill: (route: Route) => void;
  onPlacePress: (place: Place) => void;
  onSeeAllResults: () => void;
};

const THUMB_SIZE = 44;
const FILL_ICON_SIZE = 18;
const PIN_ICON_SIZE = 20;
const SEE_ALL_ICON_SIZE = 18;
/** Section eyebrow tracking in the design ("ROTALAR", "YERLER"). */
const SECTION_TRACKING = 0.4;

/**
 * Suggestions while typing (01.1 "Yazarken öneriler", aZnjb `gjzHK`): matching routes,
 * matching places and a row that submits the search. Sections without matches are hidden.
 */
export function SearchSuggestions({
  query,
  routes,
  places,
  onRoutePress,
  onRouteFill,
  onPlacePress,
  onSeeAllResults,
}: SearchSuggestionsProps) {
  const { t } = useTranslation(['discover', 'routes']);

  return (
    <View style={styles.container}>
      {routes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('search.routesSection')}
          </Text>
          {routes.map((route) => (
            <View key={route.id} style={styles.row}>
              <Pressable
                onPress={() => onRoutePress(route)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                <Image source={route.coverImage} contentFit="cover" style={styles.thumbnail} />
                <View style={styles.text}>
                  <HighlightedName name={route.name} query={query} />
                  <Text style={styles.meta} numberOfLines={1}>
                    {t('search.routeMeta', {
                      distance: formatDistance(route.distanceKm),
                      tag: t(`routes:tags.${route.tag}`),
                    })}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => onRouteFill(route)}
                accessibilityRole="button"
                accessibilityLabel={t('search.fillSuggestionA11y', { name: route.name })}
                style={({ pressed }) => [styles.fill, pressed && styles.pressed]}>
                <ArrowUpLeft width={FILL_ICON_SIZE} height={FILL_ICON_SIZE} color={colors.textTertiary} strokeWidth={1.5} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {places.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('search.placesSection')}
          </Text>
          {places.map((place) => (
            <Pressable
              key={place.id}
              onPress={() => onPlacePress(place)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.pinBadge}>
                <MapPin width={PIN_ICON_SIZE} height={PIN_ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View style={styles.text}>
                <HighlightedName name={place.name} query={query} />
                <Text style={styles.meta} numberOfLines={1}>
                  {t('search.placeMeta', { district: place.district, province: place.province })}
                </Text>
              </View>
              <Text style={styles.count}>{t('search.placeRouteCount', { count: place.routeCount })}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={onSeeAllResults}
        accessibilityRole="button"
        style={({ pressed }) => [styles.seeAll, pressed && styles.seeAllPressed]}>
        <Search width={SEE_ALL_ICON_SIZE} height={SEE_ALL_ICON_SIZE} color={colors.brand} strokeWidth={1.5} />
        <Text style={styles.seeAllLabel} numberOfLines={1}>
          {t('search.seeAllResults', { query: query.trim() })}
        </Text>
        <NavArrowRight width={SEE_ALL_ICON_SIZE} height={SEE_ALL_ICON_SIZE} color={colors.brand} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

/** Name with the typed letters in bold ("**Adr**asan Rotası"). */
function HighlightedName({ name, query }: { name: string; query: string }) {
  const { before, match, after } = highlightMatch(name, query);
  return (
    <Text style={styles.name} numberOfLines={1}>
      {before}
      {match ? <Text style={styles.nameMatch}>{match}</Text> : null}
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    letterSpacing: SECTION_TRACKING,
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: THUMB_SIZE + 2 * spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  thumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.chip,
  },
  pinBadge: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  nameMatch: {
    fontFamily: fontFamily.bold,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  count: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  // 44 pt target around the 18 pt glyph, flush with the content edge.
  fill: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  seeAllPressed: {
    backgroundColor: colors.surfacePressed,
  },
  seeAllLabel: {
    ...typography.bodySemibold,
    flex: 1,
    color: colors.brand,
  },
});
