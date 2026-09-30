import { G, Path } from 'react-native-svg';

/** BMW roundel — Pencil `qNemJ` (paths `aapL3`, `tGhVO`, `o2gty`, `q2WoPt`). */
export function BmwMark() {
  return (
    <G>
      <G transform="translate(1 1)">
        <Path
          d="M26 13c0 7.1797-5.8203 13-13 13-7.1797 0-13-5.8203-13-13 0-7.1797 5.8203-13 13-13 7.1797 0 13 5.8203 13 13z"
          fill="#0b0b0b"
        />
      </G>
      <G transform="translate(4.6 4.6)">
        <Path
          d="M18.8 9.4c0 5.19148-4.20852 9.4-9.4 9.4-5.19148 0-9.4-4.20852-9.4-9.4 0-5.19148 4.20852-9.4 9.4-9.4 5.19148 0 9.4 4.20852 9.4 9.4z"
          fill="#ffffff"
        />
      </G>
      <G transform="translate(14 4.6)">
        <Path
          d="M0 0c2.49304 0 4.88396 0.99035 6.6468 2.7532 1.76284 1.76284 2.7532 4.15377 2.7532 6.6468l-9.4 0 0-9.4z"
          fill="#0066b1"
        />
      </G>
      <G transform="translate(4.6 14)">
        <Path
          d="M9.4 9.4c-2.49304 0-4.88396-0.99035-6.6468-2.7532-1.76284-1.76284-2.7532-4.15377-2.7532-6.6468l9.4 0 0 9.4z"
          fill="#0066b1"
        />
      </G>
    </G>
  );
}
