import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

import { DESIGN_CANVAS } from './designCanvas';

type FadeStop = { offset: number; opacity: number };

type DesignFadeProps = {
  top: number;
  height: number;
  /** Surface opacity from the top (offset 0) to the bottom (offset 1) of the band. */
  stops: readonly FadeStop[];
};

/** Vertical fade to the screen surface ("Geçiş" / "Üst geçiş" rectangles of the onboarding art). */
export function DesignFade({ top, height, stops }: DesignFadeProps) {
  // SVG ids are document-wide on web; strip the colons React puts in `useId`.
  const gradientId = `fade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.band, { top, height }]} pointerEvents="none">
      <Svg width={DESIGN_CANVAS.width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {stops.map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={colors.surface}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width={DESIGN_CANVAS.width} height={height} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    width: DESIGN_CANVAS.width,
  },
});
