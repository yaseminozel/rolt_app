import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

type QrCodeProps = {
  value: string;
  size: number;
  color?: string;
};

/**
 * QR code for a link, drawn as one SVG path (09.02 "Karekod"). Medium error correction keeps
 * it scannable from a phone screen.
 */
export function QrCode({ value, size, color = colors.textPrimary }: QrCodeProps) {
  const { path, count } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const modules = qr.modules;
    let d = '';
    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (modules.get(row, column)) {
          d += `M${column} ${row}h1v1h-1z`;
        }
      }
    }
    return { path: d, count: modules.size };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
      <Path d={path} fill={color} />
    </Svg>
  );
}
