import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, shadows } from '@/theme';

/** "Route cluster" (07.01 `ygtOL`): 72 pt halo around a 52 pt badge. */
export const ROUTE_CLUSTER_SIZE = 72;
const BADGE_SIZE = 52;
/** White ring of the other routes' clusters while one is selected (07.01 "Diğer rotalar"). */
const INACTIVE_RING = 3;

type RouteClusterMarkerProps = {
  count: number;
  /** The unit under the count, e.g. "rota". */
  unitLabel: string;
  accessibilityLabel: string;
  onPress?: () => void;
  /** `inactive`: grey with a white ring and no halo, for routes other than the selected one. */
  tone?: 'active' | 'inactive';
};

/**
 * Route count badge on "Haritada Keşfet": routes whose markers would overlap at the current
 * zoom are drawn as one badge ("8 rota"). Centred in a 72 pt box, so anchor it at its middle.
 */
export function RouteClusterMarker({
  count,
  unitLabel,
  accessibilityLabel,
  onPress,
  tone = 'active',
}: RouteClusterMarkerProps) {
  const inactive = tone === 'inactive';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.box}>
      {inactive ? null : <View style={styles.halo} />}
      <View style={[styles.badge, inactive ? styles.badgeInactive : styles.badgeActive]}>
        <Text style={styles.count} numberOfLines={1}>
          {count}
        </Text>
        <Text style={styles.unit} numberOfLines={1}>
          {unitLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: ROUTE_CLUSTER_SIZE,
    height: ROUTE_CLUSTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    ...StyleSheet.absoluteFill,
    borderRadius: ROUTE_CLUSTER_SIZE / 2,
    backgroundColor: colors.clusterHalo,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: -2,
  },
  badgeActive: {
    backgroundColor: colors.brand,
    boxShadow: shadows.mapCluster,
  },
  badgeInactive: {
    backgroundColor: colors.clusterInactive,
    borderWidth: INACTIVE_RING,
    borderColor: colors.surface,
    boxShadow: shadows.mapLabel,
  },
  count: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textInverse,
  },
  unit: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textInverse,
  },
});
