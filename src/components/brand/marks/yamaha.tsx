import { G, Path } from 'react-native-svg';

const stroke = {
  fill: 'none',
  stroke: '#ffffff',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Yamaha mark — Pencil `avNYb` (circle `pDsW5`, tuning-fork strokes in group `kwLxa`). */
export function YamahaMark() {
  return (
    <G>
      <G transform="translate(1 1)">
        <Path
          d="M26 13c0 7.1797-5.8203 13-13 13-7.1797 0-13-5.8203-13-13 0-7.1797 5.8203-13 13-13 7.1797 0 13 5.8203 13 13z"
          fill="#e60012"
        />
      </G>
      <G transform="translate(3.98 5.2)">
        <G transform="translate(5.22 0)">
          <Path d="M0 0l4.8 8.4 4.8-8.4" {...stroke} />
        </G>
        <G transform="translate(10.37 9)">
          <Path d="M9.65 0l-9.65 0 4.85 8.4" {...stroke} />
        </G>
        <G transform="translate(0 9)">
          <Path d="M4.8 8.36l4.87-8.36-9.67 0.04" {...stroke} />
        </G>
      </G>
    </G>
  );
}
