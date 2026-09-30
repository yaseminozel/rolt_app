import { G, Path, Text as SvgText } from 'react-native-svg';

import { MARK_FONT_FAMILY, SHIELD_PATH, SHIELD_TRANSFORM } from './shared';

/**
 * Harley-Davidson shield — Pencil `UQNXV` (shield `ciYMM`, bar `k1aKz`, text `T84Mqz`:
 * Inter 800, 5, letter-spacing 0.1, centered in an 11 × 6 box at (9, 11.3)).
 */
export function HarleyDavidsonMark() {
  return (
    <G>
      <G transform={SHIELD_TRANSFORM}>
        <Path d={SHIELD_PATH} fill="#0b0b0b" />
      </G>
      <G transform="translate(3.9 11.2)">
        <Path d="M0 0l20.2 0 0 5.6-20.2 0 0-5.6z" fill="#f26522" />
      </G>
      <SvgText
        x={14.5}
        y={16.12}
        textAnchor="middle"
        fontFamily={MARK_FONT_FAMILY}
        fontSize={5}
        letterSpacing={0.1}
        fill="#ffffff">
        H-D
      </SvgText>
    </G>
  );
}
