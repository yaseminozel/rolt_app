import { G, Path } from 'react-native-svg';

/** Honda wing mark — Pencil `e7KsV` (paths `MxP7O`, `wnqhf`). */
export function HondaMark() {
  return (
    <G>
      <G transform="translate(1.4 6.6)">
        <Path
          d="M25.1 0c-8.9 0.5-16.3 3.6-21.9 9.5l-3.2 3.4 6.9 0c4.3-6.6 10.3-10.7 18.2-12.9z"
          fill="#e4002b"
        />
      </G>
      <G transform="translate(8.2 12.8)">
        <Path
          d="M18.4 0c-6.6 0.7-12.1 3.1-16.3 7.3l-2.1 2.1 5.4 0c3.2-4 7.5-6.8 13-8.3l0-1.1z"
          fill="#e4002b"
        />
      </G>
    </G>
  );
}
