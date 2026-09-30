import Svg, { Path, type SvgProps } from 'react-native-svg';

/**
 * Glyphs of the "Sürüş detayları" rows (01.6 `sI7yE`, `J2gnE0`), drawn from the design
 * geometry because Iconoir has no mountain or road icon. Same props as Iconoir icons.
 */
export function DifficultyIcon({ color = 'currentColor', strokeWidth = 1.7, ...props }: SvgProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none" {...props}>
      <Path
        d="M2.57 19.15h18.4l-7.6-14.2-3.9 7-2.4-3.4-4.5 10.6z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RoadIcon({ color = 'currentColor', strokeWidth = 1.7, ...props }: SvgProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none" {...props}>
      <Path
        d="M6.6 18.79l2.2-17M15.6 18.79l-2.2-17M11 7.37V4.77m0 8.2v-2.6m0 8.2v-2.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
