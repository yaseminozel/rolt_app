import { G, Path, Text as SvgText } from 'react-native-svg';

import { MARK_FONT_FAMILY, SHIELD_PATH, SHIELD_TRANSFORM } from './shared';

/**
 * Ducati shield — Pencil `camyX` (shield `KrdQ4`, text `F8UoP`: Inter 800, 5,
 * letter-spacing 0.1, centered in a 20 × 6 box at (4, 10)).
 */
export function DucatiMark() {
  return (
    <G>
      <G transform={SHIELD_TRANSFORM}>
        <Path d={SHIELD_PATH} fill="#cc0000" />
      </G>
      <SvgText
        x={14}
        y={14.82}
        textAnchor="middle"
        fontFamily={MARK_FONT_FAMILY}
        fontSize={5}
        letterSpacing={0.1}
        fill="#ffffff">
        DUCATI
      </SvgText>
    </G>
  );
}
