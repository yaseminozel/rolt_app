import { Clock, MapPin, NavigatorAlt, StarSolid } from 'iconoir-react-native';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ServicePlace } from '@/features/places/types';
import { formatDistance, formatNumber } from '@/i18n/format';
import { colors, radius, spacing, typography } from '@/theme';

import { ServicePlaceMarker } from './ServicePlaceMarker';

const META_ICON_SIZE = 14;
const DIRECTIONS_SIZE = 40;
const DIRECTIONS_ICON_SIZE = 20;

type ServicePlaceRowProps = {
  place: ServicePlace;
  /** Distance from the rider (or the map centre), when known. */
  distanceKm: number | null;
  onPress: () => void;
  onDirections: () => void;
  /** The last row has no divider. */
  last?: boolean;
};

/**
 * Row of the "Benzinlikler" / "Tamirciler" sheet (07.02, 07.03 "List Item / Service"): pin, name,
 * address, rating · distance · opening state, and the round "Yol tarifi" button.
 */
export function ServicePlaceRow({
  place,
  distanceKm,
  onPress,
  onDirections,
  last = false,
}: ServicePlaceRowProps) {
  const { t } = useTranslation('explore');
  const meta: { key: string; node: ReactNode }[] = [];
  if (place.rating !== undefined) {
    meta.push({
      key: 'rating',
      node: (
        <>
          <StarSolid width={META_ICON_SIZE} height={META_ICON_SIZE} color={colors.ratingStar} />
          <Text style={styles.metaValue}>
            {formatNumber(place.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Text>
        </>
      ),
    });
  }
  if (distanceKm !== null) {
    meta.push({
      key: 'distance',
      node: (
        <>
          <MapPin
            width={META_ICON_SIZE}
            height={META_ICON_SIZE}
            color={colors.metaIcon}
            strokeWidth={1.5}
          />
          <Text style={styles.metaValue}>{formatDistance(distanceKm, 1)}</Text>
        </>
      ),
    });
  }
  if (place.opening) {
    const tint = place.opening === 'closed' ? colors.dangerText : colors.success;
    meta.push({
      key: 'opening',
      node: (
        <>
          <Clock width={META_ICON_SIZE} height={META_ICON_SIZE} color={tint} strokeWidth={1.5} />
          <Text style={[styles.metaValue, { color: tint }]}>
            {t(`places.opening.${place.opening}`)}
          </Text>
        </>
      ),
    });
  }

  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.main}>
        <ServicePlaceMarker category={place.category} />
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          {place.address ? (
            <Text style={styles.address} numberOfLines={1}>
              {place.address}
            </Text>
          ) : null}
          {meta.length > 0 ? (
            <View style={styles.meta}>
              {meta.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 ? <Text style={styles.separator}>·</Text> : null}
                  {item.node}
                </Fragment>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onDirections}
        accessibilityRole="button"
        accessibilityLabel={t('places.directions', { name: place.name })}
        hitSlop={(44 - DIRECTIONS_SIZE) / 2}
        style={({ pressed }) => [styles.directions, pressed && styles.directionsPressed]}>
        <NavigatorAlt
          width={DIRECTIONS_ICON_SIZE}
          height={DIRECTIONS_ICON_SIZE}
          color={colors.textPrimary}
          strokeWidth={1.5}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontFamily: typography.bodySemibold.fontFamily,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  address: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaValue: {
    ...typography.calloutMedium,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  separator: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  directions: {
    width: DIRECTIONS_SIZE,
    height: DIRECTIONS_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  directionsPressed: {
    backgroundColor: colors.surfacePressed,
  },
});
