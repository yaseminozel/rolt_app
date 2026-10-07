import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { NavigationMapView } from '@/components/navigation/NavigationMapView';
import { useRideSession } from '@/features/navigation/RideSessionProvider';
import { rideLine } from '@/features/navigation/ridePlan';
import { formatNumber } from '@/i18n/format';
import { colors, fontFamily } from '@/theme';

const COUNTDOWN_FROM = 5;
const TICK_MS = 1_000;

/**
 * 06.05 Rotayı sür / Geri sayım (Pencil `JMd0a`): 5 → 1 over the dimmed map with "Telefonunu
 * sabitle, kaskını tak", then navigation replaces it (back can't return to the countdown).
 */
export default function CountdownScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { t } = useTranslation('ride');
  const { route, reversed, plan, stops } = useRideSession();
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const line = useMemo(() => rideLine(route, reversed), [route, reversed]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t('countdown.a11y', { count }));
    if (count === 0) {
      router.replace({ pathname: '/ride/[routeId]/navigate', params: { routeId } });
      return;
    }
    const timer = setTimeout(() => setCount((value) => value - 1), TICK_MS);
    return () => clearTimeout(timer);
  }, [count, routeId, t]);

  return (
    <View style={styles.screen}>
      <NavigationMapView
        line={plan?.geometry ?? line}
        stops={stops.map((stop) => ({ id: stop.id, coordinates: stop.coordinates }))}
        finish={line[line.length - 1]}
        camera={{ mode: 'overview', padding: { top: 120, right: 40, bottom: 120, left: 40 } }}
      />
      <View style={styles.scrim}>
        <Text style={styles.count} accessibilityElementsHidden>
          {formatNumber(Math.max(1, count))}
        </Text>
        <Text style={styles.hint}>{t('countdown.hint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.mapScrim,
  },
  count: {
    fontFamily: fontFamily.bold,
    fontSize: 140,
    lineHeight: 160,
    letterSpacing: -5.6,
    color: colors.textInverse,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textInverse,
  },
});
