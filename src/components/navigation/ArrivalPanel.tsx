import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

import { MetricTiles, type MetricTile } from './MetricTiles';

const illustration = require('../../../assets/images/ride/route-complete.png');

type ArrivalPanelProps = {
  title: string;
  description: string;
  tiles: MetricTile[];
  saveLabel: string;
  leaveLabel: string;
  onSave: () => void;
  onLeave: () => void;
};

/**
 * "Overlay / Bottom Sheet · Rota tamamlandı" (06.07 `wbn2e`): illustration, "Rotayı tamamladın",
 * the ride's distance, time and average speed, "Sürüşü kaydet" and "Kaydetmeden çık".
 */
export function ArrivalPanel({ title, description, tiles, saveLabel, leaveLabel, onSave, onLeave }: ArrivalPanelProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.handle} />
      <View style={styles.content}>
        <View style={styles.heading}>
          <Image source={illustration} style={styles.illustration} accessibilityIgnoresInvertColors />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <MetricTiles tiles={tiles} />
        <View style={styles.actions}>
          <Button label={saveLabel} onPress={onSave} style={styles.tall} />
          <Button variant="text" label={leaveLabel} onPress={onLeave} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.bottomPanel,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  content: {
    gap: spacing.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  heading: {
    gap: spacing.sm,
  },
  illustration: {
    width: 111,
    height: 120,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
  // "Sürüşü kaydet" is 52 pt in the design.
  tall: {
    height: 52,
  },
});
