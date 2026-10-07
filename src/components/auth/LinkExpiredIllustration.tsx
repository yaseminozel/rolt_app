import { Image, StyleSheet } from 'react-native';

/** Illustration of 02.07 "Süresi dolmuş bağlantı" (`XYhCY`, 109 × 140). */
const WIDTH = 109;
const HEIGHT = 140;

const source = require('../../../assets/images/email-link-expired.jpg');

/** Rider next to a warning pin, above the title of the expired-link screens. */
export function LinkExpiredIllustration() {
  return (
    <Image
      source={source}
      style={styles.image}
      accessibilityIgnoresInvertColors
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: WIDTH,
    height: HEIGHT,
  },
});
