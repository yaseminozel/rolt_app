import Svg, { Path, type SvgProps } from 'react-native-svg';

/**
 * "Dağ yolları" chip glyph (Fv4ol `noO4r`). The design node is a Lucide `mountain` icon
 * reference without path data; geometry copied from lucide-static v1.49.0 (ISC).
 * Iconoir has no equivalent. Accepts the same props as Iconoir icons so it fits `SelectableChip`.
 */
export function MountainIcon({ color = 'currentColor', strokeWidth = 1.5, ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m8 3 4 8 5-5 5 15H2L8 3z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
