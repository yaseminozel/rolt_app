import { G, Path, Text as SvgText } from 'react-native-svg';

import { MARK_FONT_FAMILY, SHIELD_PATH, SHIELD_TRANSFORM } from './shared';

/**
 * Triumph shield — Pencil `SVXIR` (shield `aLHP2`, text `VsiLg`: Inter 800, 12,
 * centered in a 9 × 15 box at (9.5, 7)).
 */
export function TriumphMark() {
  return (
    <G>
      <G transform={SHIELD_TRANSFORM}>
        <Path d={SHIELD_PATH} fill="#1b2a4a" />
      </G>
      <SvgText
        x={14}
        y={18.86}
        textAnchor="middle"
        fontFamily={MARK_FONT_FAMILY}
        fontSize={12}
        fill="#ffffff">
        T
      </SvgText>
    </G>
  );
}
