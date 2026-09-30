import Svg, { Circle, Path } from 'react-native-svg';

type LongRideIconProps = {
  size?: number;
  color: string;
  /** Stroke width in the 24-unit viewBox. */
  strokeWidth?: number;
};

/**
 * Custom "Uzun Yol" pictogram (winding road with end dots). Not part of Iconoir;
 * geometry flattened from the "Tip ikonu" frame in Pencil `N0mch` (Tone=Uzun Yol).
 */
export function LongRideIcon({ size = 24, color, strokeWidth = 1.5 }: LongRideIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 20C10 20 16.5 17.5 12 12C7.5 6.5 14 4 14 4M18 4H21M3 20H6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={14} cy={4} r={1} fill={color} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={10} cy={20} r={1} fill={color} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
