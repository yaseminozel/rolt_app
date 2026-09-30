import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { EmptyState, type EmptyStateAction } from '@/components/feedback/EmptyState';
import { colors, radius, shadows } from '@/theme';

type EmptySearchResultsProps = {
  title: string;
  description: string;
  action: EmptyStateAction;
};

/**
 * Photos of the illustration. The design's right card (`JqUem`, image-import-18) is a
 * Google Maps screenshot that can't ship in the app, so a route photo takes its place.
 */
const PHOTOS = {
  back: require('../../../assets/images/routes/route-forest-ride.jpg') as ImageSource,
  right: require('../../../assets/images/routes/route-coast.jpg') as ImageSource,
  front: require('../../../assets/images/routes/route-desert-rider.jpg') as ImageSource,
};

const ILLUSTRATION_HEIGHT = 141;
const GROUP_WIDTH = 136;
const GROUP_HEIGHT = 121;
const GROUP_TOP = 10;
const CARD_WIDTH = 72;
const CARD_HEIGHT = 88;

/**
 * Card placements converted from the design group (`m4dydq`): Pencil rotates around the
 * top-left corner and counter-clockwise, React Native around the centre and clockwise.
 */
const CARDS: { key: keyof typeof PHOTOS; style: ViewStyle }[] = [
  { key: 'back', style: { left: 6.3, top: 5, transform: [{ rotate: '-8.81deg' }], boxShadow: shadows.stackedCard } },
  { key: 'right', style: { left: 49.5, top: 17.7, transform: [{ rotate: '23.36deg' }], boxShadow: shadows.stackedCard } },
  { key: 'front', style: { left: 24, top: 33, boxShadow: shadows.raised } },
];

/**
 * 01.3 Search — No results (bfMyW `vKY7V`): tilted route photos over the shared
 * `EmptyState` copy and its outlined action ("Rota öner", or "Filtreleri temizle" when
 * filters hide every result).
 */
export function EmptySearchResults({ title, description, action }: EmptySearchResultsProps) {
  return <EmptyState title={title} description={description} action={action} icon={<Illustration />} />;
}

function Illustration() {
  return (
    <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.group}>
        {CARDS.map(({ key, style }) => (
          <View key={key} style={[styles.card, style]}>
            <Image source={PHOTOS[key]} contentFit="cover" style={styles.photo} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  illustration: {
    alignSelf: 'stretch',
    height: ILLUSTRATION_HEIGHT,
    alignItems: 'center',
  },
  group: {
    width: GROUP_WIDTH,
    height: GROUP_HEIGHT,
    marginTop: GROUP_TOP,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  photo: {
    flex: 1,
    borderRadius: radius.md - 2,
  },
});
