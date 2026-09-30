import { Text as SvgText } from 'react-native-svg';

import { MARK_FONT_FAMILY } from './shared';

/**
 * KTM wordmark — Pencil `tkGyc` (text `k3hHBk`: Inter 800, 10.5, letter-spacing -0.21,
 * centered in a 25 × 13 box at (2, 9)). Baseline derived from Inter's ascender metrics.
 */
export function KtmMark() {
  return (
    <SvgText
      x={14.5}
      y={19.31}
      textAnchor="middle"
      fontFamily={MARK_FONT_FAMILY}
      fontSize={10.5}
      letterSpacing={-0.21}
      fill="#ff6600">
      KTM
    </SvgText>
  );
}
