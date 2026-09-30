import Svg, { Circle, type SvgProps } from 'react-native-svg';

/**
 * Six-dot drag handle of the stop rows (04.1 "Sürükle", Lucide `grip-vertical`). Iconoir has no
 * grip glyph (its `Drag` is a four-way arrow); same props as Iconoir icons.
 */
export function GripVerticalIcon({ color = 'currentColor', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...props}>
      {[9, 15].flatMap((cx) =>
        [5, 12, 19].map((cy) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.5} fill={color} />),
      )}
    </Svg>
  );
}
