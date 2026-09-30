import Svg, { Path, type SvgProps } from 'react-native-svg';

const PATHS = [
  'M12 2v8',
  'm4.93 10.93 1.41 1.41',
  'M2 18h2',
  'M20 18h2',
  'm19.07 10.93-1.41 1.41',
  'M22 22H2',
  'm8 6 4-4 4 4',
  'M16 18a4 4 0 0 0-8 0',
];

/**
 * "Günün eşleşmeleri" benefit glyph (RzQd4 `XhQB0`). The design node is a Lucide `sunrise`
 * icon reference without path data; geometry copied from lucide-static v1.49.0 (ISC). Iconoir has no
 * sunrise. Same props as Iconoir icons.
 */
export function SunriseIcon({ color = 'currentColor', strokeWidth = 1.5, ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      {PATHS.map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
