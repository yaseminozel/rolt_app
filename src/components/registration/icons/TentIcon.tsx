import Svg, { Path, type SvgProps } from 'react-native-svg';

/**
 * "Off-road" chip glyph (Fv4ol `cdN56`). The design node is a Lucide `tent` icon
 * reference without path data; geometry copied from lucide-static v1.49.0 (ISC).
 * Iconoir has no equivalent. Accepts the same props as Iconoir icons so it fits `SelectableChip`.
 */
export function TentIcon({ color = 'currentColor', strokeWidth = 1.5, ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M3.5 21 14 3M20.5 21 10 3M15.5 21 12 15l-3.5 6M2 21h20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
