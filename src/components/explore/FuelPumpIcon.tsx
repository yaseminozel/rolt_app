import Svg, { Path, type SvgProps } from 'react-native-svg';

/**
 * Fuel pump glyph of "Benzinlik" (07.01 chip, 07.02 `I3V8M` pins), drawn from the design
 * geometry because the bundled Iconoir has no pump (its `Gas` is a cylinder). Same props as
 * Iconoir icons.
 */
export function FuelPumpIcon({ color = 'currentColor', strokeWidth = 1.5, ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="-3 -4 24 24" fill="none" {...props}>
      <Path
        d="M1 17V.6A.6.6 0 0 1 1.6 0h8.8a.6.6 0 0 1 .6.6V17M12 17H0M11 6h2.4a.6.6 0 0 1 .6.6V12a1.5 1.5 0 0 0 3 0V4L14 1M8 4H4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
