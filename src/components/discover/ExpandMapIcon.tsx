import Svg, { G, Path } from 'react-native-svg';

const ARROW =
  'M1 0.75c0-0.41421 0.33579-0.75 0.75-0.75l4 0c0.41421 0 0.75 0.33579 0.75 0.75l0 4c0 0.41421-0.33579 0.75-0.75 0.75-0.41421 0-0.75-0.33579-0.75-0.75l0-2.18934-3.71967 3.71967c-0.29289 0.29289-0.76777 0.29289-1.06066 0-0.29289-0.29289-0.29289-0.76777 0-1.06066l3.71967-3.71967-2.18934 0c-0.41421 0-0.75-0.33579-0.75-0.75z';
/** The arrow's 6.5-unit geometry drawn in a 5.42 pt box. */
const SCALE = 5.416666 / 6.5;

/**
 * "enlarge" on the Discover map card (05.01 Pencil `uVdPv`): two short arrows pointing out to
 * the top-right and bottom-left corners — the design's own glyph, not Iconoir's `Enlarge`.
 */
export function ExpandMapIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <G transform={`translate(11.875 2.7083) scale(${SCALE})`}>
        <Path d={ARROW} fill={color} />
      </G>
      <G transform={`translate(8.125 17.2917) rotate(180) scale(${SCALE})`}>
        <Path d={ARROW} fill={color} />
      </G>
    </Svg>
  );
}
