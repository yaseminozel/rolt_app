import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fontFamily, radius, shadows } from '@/theme';

/** Wide enough for the tag in both languages; the marker is centred in it horizontally. */
export const ROUTE_ENDPOINT_MARKER_WIDTH = 120;

/** Tag (24 pt) plus its 5 pt tail. */
const TAG_HEIGHT = 29;
/** "Başlangıç noktası": 32 pt halo, its top 2 pt above the tag's tail tip. */
const START_HALO = 32;
const START_DOT = 18;
const START_OVERLAP = 2;
const START_HEIGHT = TAG_HEIGHT - START_OVERLAP + START_HALO;
/** "Varış noktası": 28 × 36 pin, 3 pt under the tag; the tip is 1.3 pt above the box bottom. */
const FINISH_GAP = 3;
const FINISH_PIN = { width: 28, height: 36, tip: 34.66 };
const FINISH_HEIGHT = TAG_HEIGHT + FINISH_GAP + FINISH_PIN.height;
const FINISH_PIN_PATH =
  'M13 0C5.82 0 0 5.82 0 13c0 9.2 10.6 18.9 12.1 20.3.24.23.56.36.9.36s.66-.13.9-.36C15.4 31.9 26 22.2 26 13 26 5.82 20.18 0 13 0Z';

/** `MarkerView` anchors: the start dot's centre and the finish pin's tip. */
export const ROUTE_START_MARKER_ANCHOR = {
  x: 0.5,
  y: (TAG_HEIGHT - START_OVERLAP + START_HALO / 2) / START_HEIGHT,
};
export const ROUTE_FINISH_MARKER_ANCHOR = {
  x: 0.5,
  y: (TAG_HEIGHT + FINISH_GAP + FINISH_PIN.tip) / FINISH_HEIGHT,
};
/** Same anchors in points, for overlays positioned by hand. */
export const ROUTE_START_MARKER_OFFSET = TAG_HEIGHT - START_OVERLAP + START_HALO / 2;
export const ROUTE_FINISH_MARKER_OFFSET = TAG_HEIGHT + FINISH_GAP + FINISH_PIN.tip;

type RouteEndpointMarkerProps = {
  kind: 'start' | 'finish';
  /** "Başlangıç" / "Varış". */
  label: string;
};

/**
 * Start and finish of the selected route on "Haritada Keşfet" (07.01 `JhMSW`): a brand dot
 * with a halo and a "Başlangıç" tag, a red pin with a "Varış" tag.
 */
export function RouteEndpointMarker({ kind, label }: RouteEndpointMarkerProps) {
  const tint = kind === 'start' ? colors.brand : colors.mapFinish;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={label}
      style={[styles.box, { height: kind === 'start' ? START_HEIGHT : FINISH_HEIGHT }]}>
      <View style={styles.tag}>
        <View style={[styles.tagBody, { backgroundColor: tint }]}>
          <Text style={styles.tagLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Svg width={10} height={5}>
          <Path d="M0.67 0H9.33L5 5Z" fill={tint} />
        </Svg>
      </View>
      {kind === 'start' ? (
        <View style={styles.startHalo}>
          <View style={styles.startDot} />
        </View>
      ) : (
        <Svg
          width={FINISH_PIN.width}
          height={FINISH_PIN.height}
          viewBox="-1 -1 28 36"
          style={styles.finishPin}>
          <Path
            d={FINISH_PIN_PATH}
            fill={colors.mapFinish}
            stroke={colors.surface}
            strokeWidth={2}
          />
          <Circle cx={13} cy={13} r={5} fill={colors.surface} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: ROUTE_ENDPOINT_MARKER_WIDTH,
    alignItems: 'center',
  },
  tag: {
    height: TAG_HEIGHT,
    alignItems: 'center',
    zIndex: 1,
  },
  tagBody: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    boxShadow: shadows.mapLabel,
  },
  tagLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textInverse,
  },
  startHalo: {
    width: START_HALO,
    height: START_HALO,
    marginTop: -START_OVERLAP,
    borderRadius: START_HALO / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.locationHalo,
  },
  startDot: {
    width: START_DOT,
    height: START_DOT,
    borderRadius: START_DOT / 2,
    backgroundColor: colors.brand,
    boxShadow: shadows.mapLabel,
  },
  finishPin: {
    marginTop: FINISH_GAP,
  },
});
