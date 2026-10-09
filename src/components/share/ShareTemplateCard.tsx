import { Image } from 'expo-image';
import { Check, Motorcycle } from 'iconoir-react-native';
import { forwardRef } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { RideMapPreview } from '@/components/record/RideMapPreview';
import type { BoxPadding } from '@/components/route-builder/routeProjection';
import type { LngLat } from '@/features/routes/types';
import { formatCompactDuration, formatDistance } from '@/i18n/format';
import { colors, fontFamily, radius } from '@/theme';

/** The four templates of 09.03 (Pencil `DTyGI`, `ppUSL`, `EXzqm`, `R4q0C`). */
export type ShareTemplate = 'map' | 'transparent' | 'photo' | 'brand';

export const SHARE_TEMPLATES: readonly ShareTemplate[] = ['map', 'transparent', 'photo', 'brand'];

/** What a template shows: the ride's name, distance, time and its map or first photo. */
export type ShareRideData = {
  title: string;
  distanceKm: number;
  durationMinutes: number;
  /** Recorded rides draw their track; sample rides have a static map picture. */
  track?: LngLat[][];
  mapImage?: ImageSourcePropType;
  photo?: ImageSourcePropType;
};

/** Card size in the carousel; exports render the same layout `scale` times larger. */
export const TEMPLATE_SIZE = { width: 153, height: 272 };
const CHECKER = 24;
const MAP_PADDING: BoxPadding = { top: 32, right: 24, bottom: 120, left: 24 };
const BRAND_MAP_PADDING: BoxPadding = { top: 12, right: 12, bottom: 12, left: 12 };

type ShareTemplateCardProps = {
  template: ShareTemplate;
  ride: ShareRideData;
  /** Carousel state; exports pass neither. */
  selected?: boolean;
  /** The picture that is shared: 1 in the carousel, larger for the export. */
  scale?: number;
  /** The transparent template exports without its checkerboard. */
  forExport?: boolean;
};

/**
 * A share template (09.03 "Paylaşım Şablonları"): the ride over its map, on transparency (for
 * story stickers), over its first photo, or on the brand pattern, with the ROLT mark, the ride
 * name and distance | time. Selected cards get the blue outline and check.
 */
export const ShareTemplateCard = forwardRef<View, ShareTemplateCardProps>(function ShareTemplateCard(
  { template, ride, selected, scale = 1, forExport = false },
  ref,
) {
  const width = TEMPLATE_SIZE.width * scale;
  const height = TEMPLATE_SIZE.height * scale;
  const dark = template !== 'transparent';
  const ink = dark ? colors.textInverse : colors.textPrimary;
  const s = (value: number) => value * scale;
  const shadeHeight = template === 'photo' ? 160 : 150;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.card,
        { width, height, borderRadius: forExport ? 0 : s(radius.lg) },
        template === 'transparent' && !forExport && styles.transparentCard,
        template === 'brand' && styles.brandCard,
      ]}>
      {template === 'map' ? <MapLayer ride={ride} padding={MAP_PADDING} /> : null}
      {template === 'photo' && ride.photo ? (
        <Image source={ride.photo} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : null}
      {template === 'transparent' && !forExport ? <Checkerboard width={width} height={height} size={s(CHECKER)} /> : null}
      {template === 'brand' ? (
        <>
          <View
            style={[
              styles.stripe,
              { left: s(-42.1), top: s(-7.2), width: s(300), height: s(34), backgroundColor: colors.shareStripe },
            ]}
          />
          <View
            style={[
              styles.stripe,
              { left: s(7.9), top: s(38.8), width: s(300), height: s(34), backgroundColor: colors.shareStripeSoft },
            ]}
          />
          <View
            style={[
              styles.brandMap,
              { left: s(12), top: s(16), width: s(129), height: s(120), borderRadius: s(radius.md) },
            ]}>
            <MapLayer ride={ride} padding={BRAND_MAP_PADDING} />
          </View>
        </>
      ) : null}
      {template === 'map' || template === 'photo' ? (
        <Svg style={[styles.shade, { height: s(shadeHeight) }]} width={width} height={s(shadeHeight)}>
          <Defs>
            <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.shareShadeClear} />
              <Stop offset="1" stopColor={colors.shareShade} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={s(shadeHeight)} fill="url(#shade)" />
        </Svg>
      ) : null}

      <View style={[styles.content, { left: s(12), right: s(12), bottom: s(12), gap: s(8) }]}>
        <View style={styles.brandRow}>
          <Motorcycle width={s(22)} height={s(16)} color={ink} strokeWidth={1.5} />
          <Text style={[styles.mark, { color: ink, fontSize: s(12), letterSpacing: s(1.2) }]}>ROLT</Text>
        </View>
        <Text
          style={[styles.title, { color: ink, fontSize: s(15), lineHeight: s(19) }]}
          numberOfLines={2}>
          {ride.title}
        </Text>
        <View style={[styles.metrics, { gap: s(8) }]}>
          <Text style={[styles.metric, { color: ink, fontSize: s(13), lineHeight: s(17) }]}>
            {formatDistance(ride.distanceKm, 1)}
          </Text>
          <View style={[styles.divider, { height: s(12), backgroundColor: ink }]} />
          <Text style={[styles.metric, { color: ink, fontSize: s(13), lineHeight: s(17) }]}>
            {formatCompactDuration(ride.durationMinutes)}
          </Text>
        </View>
      </View>

      {selected !== undefined ? (
        <>
          {selected ? <View style={[styles.outline, { borderRadius: radius.lg }]} pointerEvents="none" /> : null}
          <View
            style={[
              styles.check,
              selected
                ? styles.checkSelected
                : dark
                  ? styles.checkEmptyDark
                  : styles.checkEmptyLight,
            ]}>
            {selected ? <Check width={16} height={16} color={colors.textInverse} strokeWidth={2.5} /> : null}
          </View>
        </>
      ) : null}
    </View>
  );
});

function MapLayer({ ride, padding }: { ride: ShareRideData; padding: BoxPadding }) {
  if (ride.track && ride.track.flat().length > 1) {
    return <RideMapPreview track={ride.track} padding={padding} style={StyleSheet.absoluteFill} />;
  }
  return ride.mapImage ? (
    <Image source={ride.mapImage} contentFit="cover" style={StyleSheet.absoluteFill} />
  ) : null;
}

function Checkerboard({ width, height, size }: { width: number; height: number; size: number }) {
  const squares = [];
  for (let row = 0; row * size < height; row += 1) {
    for (let col = 0; col * size < width; col += 1) {
      if ((row + col) % 2 === 1) {
        squares.push(
          <Rect key={`${row}-${col}`} x={col * size} y={row * size} width={size} height={size} fill={colors.shareChecker} />,
        );
      }
    }
  }
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
      {squares}
    </Svg>
  );
}

const CHECK_SIZE = 28;

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  transparentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  brandCard: {
    backgroundColor: colors.textPrimary,
  },
  // 300 × 34 bands turned 18° counter-clockwise (positions are their centres minus half size).
  stripe: {
    position: 'absolute',
    transform: [{ rotate: '-18deg' }],
  },
  brandMap: {
    position: 'absolute',
    overflow: 'hidden',
  },
  shade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'absolute',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mark: {
    fontFamily: fontFamily.bold,
  },
  title: {
    fontFamily: fontFamily.semibold,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    fontFamily: fontFamily.monoMedium,
  },
  divider: {
    width: 1,
    opacity: 0.45,
  },
  outline: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: colors.shareSelected,
  },
  check: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.shareSelected,
  },
  checkEmptyLight: {
    borderWidth: 1,
    borderColor: colors.shareRingLight,
    backgroundColor: colors.shareRingLightFill,
  },
  checkEmptyDark: {
    borderWidth: 1,
    borderColor: colors.shareRingDark,
    backgroundColor: colors.shareRingDarkFill,
  },
});
