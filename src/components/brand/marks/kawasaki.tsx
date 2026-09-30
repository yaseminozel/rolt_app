import { G, Path } from 'react-native-svg';

/** Kawasaki "K" mark — Pencil `SRC0L` (path `v3Dtd`). */
export function KawasakiMark() {
  return (
    <G transform="translate(3.5 7.5)">
      <Path
        d="M0 0l6.2 0 0 4.2 5.4-4.2 8.6 0-8.3 6.5 8.3 6.5-8.6 0-5.4-4.2 0 4.2-6.2 0 0-13z"
        fill="#0b0b0b"
      />
    </G>
  );
}
