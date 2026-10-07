import Svg, { Path, type SvgProps } from 'react-native-svg';

/**
 * Stacked map layers glyph of the "Haritada Keşfet" top bar (01.7 `jXD5B`): a diamond over a
 * second, partly hidden one. Iconoir has no layers icon; same props as Iconoir icons.
 */
export function LayersIcon({ color = 'currentColor', strokeWidth = 1.5, ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 3.5l8.5 5-8.5 5-8.5-5 8.5-5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M6.4 11.6L3.5 13.3l8.5 5 8.5-5-2.9-1.7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
