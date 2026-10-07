import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { LocationBenefitCard } from '@/components/registration/LocationBenefitCard';
import { PlaceResultRow } from '@/components/registration/PlaceResultRow';
import { RegistrationStepScreen } from '@/components/registration/RegistrationStepScreen';
import { SearchField } from '@/components/ui/SearchField';
import { useDebouncedValue } from '@/features/discover/useDebouncedValue';
import { useForegroundLocationPermission } from '@/features/discover/useForegroundLocationPermission';
import { findCityByName } from '@/features/location/turkishCities';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import {
  createSearchSessionToken,
  placeSearch,
  type PlaceSuggestion,
} from '@/features/route-suggestion/services';
import type { Place } from '@/features/route-suggestion/types';
import { colors, spacing, typography } from '@/theme';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

const benefits = [
  { key: 'nearbyRoutes', image: require('../../../assets/images/registration/benefit-nearby-routes.jpg') },
  { key: 'localPicks', image: require('../../../assets/images/registration/benefit-local-picks.jpg') },
  { key: 'nearbyRiders', image: require('../../../assets/images/registration/benefit-nearby-riders.jpg') },
] as const;

/**
 * The province of a reverse-geocoded position ("Muratpaşa, Antalya" → "Antalya"), which is what
 * the "Konumun" field shows for the device location (04.02 `AgMCl`).
 */
function toRegionPlace(place: Place): Place {
  const parts = (place.subtitle ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  const province = [place.name, ...parts].map(findCityByName).find(Boolean)?.name;
  // Without a known province, the nearest area ("Muratpaşa") reads better than the country.
  return { ...place, name: province ?? parts[0] ?? place.name };
}

/**
 * 04.02 Kayıt tamamlama / Konum — Pencil `AgMCl` (permission granted, "Doğru yerde miyiz?"),
 * `R90P27` (searching) and `HOw3b` (no permission, "Sana özel olarak keşfet").
 * With permission the field starts at the device's province; focusing it searches places,
 * with "Mevcut konumu kullan" first. Without permission "Konum izni ver" asks the system (or
 * opens Settings once it can't) and the screen switches to the granted state.
 */
export default function RegisterLocationScreen() {
  const { t } = useTranslation(['registration', 'common']);
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const { status, enable } = useForegroundLocationPermission();
  const { locate } = useDeviceLocation();
  const granted = status === 'granted';

  const [place, setPlace] = useState<Place | undefined>(draft.homePlace);
  const [currentPlace, setCurrentPlace] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [sessionToken] = useState(createSearchSessionToken);
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  // Resolve the device position once access is granted; it pre-fills an empty field.
  useEffect(() => {
    if (!granted) {
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      setLocating(true);
      try {
        const position = await locate();
        if (!position) {
          return;
        }
        const found = await placeSearch.reverse(position);
        if (!cancelled) {
          setCurrentPlace(found);
          setPlace((previous) => previous ?? toRegionPlace(found));
        }
      } catch {
        // No position or no geocoder: the field stays empty and search still works.
      } finally {
        if (!cancelled) {
          setLocating(false);
        }
      }
    };
    resolve();
    return () => {
      cancelled = true;
    };
  }, [granted, locate]);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      return;
    }
    let cancelled = false;
    placeSearch
      .suggest(debouncedQuery, { sessionToken, proximity: currentPlace?.coordinates })
      .then((found) => {
        if (!cancelled) {
          setResults(found);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentPlace, debouncedQuery, sessionToken]);

  const finishSearch = (next: Place) => {
    setPlace(next);
    setSearching(false);
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
  };

  const handleSuggestion = async (suggestion: PlaceSuggestion) => {
    try {
      finishSearch(await placeSearch.retrieve(suggestion, { sessionToken }));
    } catch {
      // Keep searching; the row can be tapped again.
    }
  };

  const goToBike = () => router.push('/register/bike');

  const handleContinue = () => {
    updateDraft({ homePlace: place });
    goToBike();
  };

  // Wait for the first permission read so the wrong variant doesn't flash.
  if (status === null) {
    return <View style={styles.blank} />;
  }

  if (!granted) {
    return (
      <RegistrationStepScreen
        step={2}
        heading={t('location.deniedHeading')}
        description={t('location.deniedDescription')}
        ctaLabel={t('location.allow')}
        onCtaPress={enable}
        onSkip={goToBike}>
        <View style={styles.benefits}>
          {benefits.map(({ key, image }) => (
            <LocationBenefitCard
              key={key}
              image={image}
              title={t(`location.benefits.${key}.title`)}
              text={t(`location.benefits.${key}.text`)}
            />
          ))}
        </View>
      </RegistrationStepScreen>
    );
  }

  const showResults = searching && debouncedQuery.length >= MIN_QUERY_LENGTH;

  return (
    <RegistrationStepScreen
      step={2}
      heading={t('location.heading')}
      description={t('location.description')}
      ctaLabel={t('common:actions.continue')}
      onCtaPress={handleContinue}
      ctaDisabled={!place}
      onSkip={goToBike}>
      <View style={styles.search}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('location.fieldLabel')}</Text>
          <SearchField
            value={searching ? query : (place?.name ?? '')}
            onChangeText={setQuery}
            onFocus={() => setSearching(true)}
            onClear={() => setQuery('')}
            accessibilityLabel={t('location.fieldLabel')}
          />
        </View>
        {searching ? (
          <View>
            {currentPlace ? (
              <>
                <PlaceResultRow
                  currentLocation
                  name={t('location.useCurrent')}
                  subtitle={currentPlace.subtitle ?? currentPlace.name}
                  busy={locating}
                  onPress={() => finishSearch(toRegionPlace(currentPlace))}
                />
                <View style={styles.divider} />
              </>
            ) : null}
            {showResults
              ? results.map((result) => (
                  <PlaceResultRow
                    key={result.id}
                    name={result.name}
                    subtitle={result.subtitle}
                    onPress={() => handleSuggestion(result)}
                  />
                ))
              : null}
          </View>
        ) : null}
      </View>
    </RegistrationStepScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  benefits: {
    gap: spacing.md,
  },
  search: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
    backgroundColor: colors.borderSubtle,
  },
});
