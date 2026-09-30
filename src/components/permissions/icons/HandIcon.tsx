import Svg, { Path, type SvgProps } from 'react-native-svg';

const PATHS = [
  'M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
  'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2',
  'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8',
  'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
];

/**
 * Raised hand on the "Deniz birlikte sürmek istiyor" notification preview (RzQd4 `nrweB`).
 * The design node is a Lucide `hand` icon reference without path data; geometry copied from
 * lucide-static v1.49.0 (ISC). Iconoir has no open-palm equivalent. Same props as Iconoir icons.
 */
export function HandIcon({ color = 'currentColor', strokeWidth = 1.5, ...props }: SvgProps) {
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
