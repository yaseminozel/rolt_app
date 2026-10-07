import { StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/i18n/format';
import { colors, fontFamily } from '@/theme';

const SIZE = 20;

/** Numbered stop disc (06.01 "Numara", 06.06 "Sonraki durak"): white number on the dark disc. */
export function StopNumber({ number }: { number: number }) {
  return (
    <View style={styles.disc} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.number}>{formatNumber(number)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceInverse,
  },
  number: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textInverse,
  },
});
