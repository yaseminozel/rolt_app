import { G, Path } from 'react-native-svg';

const PARALLELOGRAM = 'M4.1 0l8.4 0-4.1 8-8.4 0 4.1-8z';

/** Bajaj mark — Pencil `w2Atk` (paths `yzC5G`, `YGmhE`). */
export function BajajMark() {
  return (
    <G>
      <G transform="translate(3.1 4.5)">
        <Path d={PARALLELOGRAM} fill="#005cb9" />
      </G>
      <G transform="translate(8.3 15.5)">
        <Path d={PARALLELOGRAM} fill="#005cb9" />
      </G>
    </G>
  );
}
