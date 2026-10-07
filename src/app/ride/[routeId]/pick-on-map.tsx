import { router } from 'expo-router';
import { NavArrowLeft } from 'iconoir-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback/ToastProvider';
import { MapActionButton } from '@/components/map/MapActionButton';
import { isNativeMapAvailable } from '@/components/map/BaseMap';
import { NavigationMapView } from '@/components/navigation/NavigationMapView';
import { StopDetourPanel } from '@/components/navigation/StopDetourPanel';
import { useDebouncedValue } from '@/features/discover/useDebouncedValue';
import { cumulativeDistances, pointAlong } from '@/features/navigation/geometry';
import { useRideSession } from '@/features/navigation/RideSessionProvider';
import { ON_ROUTE_OFFSET_M, placeOnRoute, rideLine } from '@/features/navigation/ridePlan';
import { stopSearch, type StopCandidate } from '@/features/navigation/stops';
import { formatGuidanceDistance } from '@/features/navigation/instructions';
import { useStopDetour } from '@/features/navigation/useStopDetour';
import type { LngLat } from '@/features/routes/types';
import { formatApproxDuration, formatClockTime, formatDistance, formatNumber } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, fontFamily, layout, shadows, spacing } from '@/theme';

const centerPin = require('../../../../assets/images/ride/pin-center.png');
/** "Pin / Merkez" 40 × 58, its tip marks the map centre. */
const PIN = { width: 40, height: 58 };
const CENTER_DEBOUNCE_MS = 400;
const TOAST_OFFSET = 44 + spacing.lg * 2;

/**
 * 06.02 Rotayı sür / Durak ekle — Haritadan seç (Pencil `i1zMe`): a fixed centre pin over the map
 * ("Haritayı kaydır, pini konumla"), the address under it, its distance from the route, the real
 * detour and "Bu noktayı seç", which adds the stop and returns to Hazırlık. Without a native map
 * (Expo Go) the pin sits on a point just off the middle of the route.
 */
export default function PickStopOnMapScreen() {
  const { t } = useTranslation(['ride', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const session = useRideSession();
  const line = useMemo(() => rideLine(session.route, session.reversed), [session.route, session.reversed]);
  const [initialCenter] = useState<LngLat>(() => {
    const cumulative = cumulativeDistances(line);
    return pointAlong(line, cumulative, (cumulative.at(-1) ?? 0) / 2).point;
  });
  const [center, setCenter] = useState<LngLat>(initialCenter);
  const settledCenter = useDebouncedValue(center, CENTER_DEBOUNCE_MS);
  const [found, setFound] = useState<{ key: string; place: StopCandidate } | null>(null);
  const centerKey = `${settledCenter[0].toFixed(5)},${settledCenter[1].toFixed(5)}`;
  const place = found?.key === centerKey ? found.place : null;
  const now = useNow();
  const detour = useStopDetour({ coordinates: settledCenter });

  useEffect(() => {
    let cancelled = false;
    stopSearch
      .reverse(settledCenter)
      .then((result) => {
        if (!cancelled) {
          setFound({ key: centerKey, place: { ...result, coordinates: settledCenter } });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [centerKey, settledCenter]);

  const placement = placeOnRoute(settledCenter, line);
  const km = formatNumber(placement.alongM / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const subtitle =
    placement.offsetM < ON_ROUTE_OFFSET_M
      ? t('pickOnMap.onRoute', { km })
      : t('pickOnMap.fromRoute', { distance: formatGuidanceDistance(placement.offsetM, t), km });
  const ready = detour.status === 'ready' ? detour : null;

  const choose = () => {
    if (!ready || !place) {
      return;
    }
    const previous = session.stops;
    const added = session.addStop({
      id: `${place.id}-${Date.now()}`,
      name: place.name,
      subtitle,
      coordinates: settledCenter,
      detourMinutes: ready.extraMinutes,
    });
    router.back();
    if (added) {
      showToast({
        variant: 'info',
        message: t('prepare.stopAdded'),
        actionLabel: t('common:actions.undo'),
        onActionPress: () => session.setStops(previous),
        bottomOffset: TOAST_OFFSET,
      });
    }
  };

  return (
    <View style={styles.screen}>
      <NavigationMapView
        line={session.plan?.geometry ?? line}
        stops={session.stops.map((stop) => ({ id: stop.id, coordinates: stop.coordinates }))}
        finish={line[line.length - 1]}
        pin={isNativeMapAvailable ? null : settledCenter}
        camera={{ mode: 'point', center: initialCenter, zoom: 15 }}
        onCenterChange={setCenter}
        overlay={
          isNativeMapAvailable ? (
            <View pointerEvents="none" style={styles.centerPinWrap}>
              <Image source={centerPin} style={styles.centerPin} />
            </View>
          ) : null
        }
      />
      <View style={[styles.back, { top: insets.top + 7 }]}>
        <MapActionButton icon={NavArrowLeft} accessibilityLabel={t('preview.back')} onPress={() => router.back()} />
      </View>
      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.hint}>
          <Text style={styles.hintLabel}>{t('pickOnMap.hint')}</Text>
        </View>
        <StopDetourPanel
          compactTitle
          title={place?.name ?? t('pickOnMap.locating')}
          subtitle={subtitle}
          metrics={[
            {
              key: 'detour',
              label: t('preview.detour'),
              value: ready
                ? t('preview.detourDistance', {
                    value: formatNumber(ready.detourM / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                  })
                : null,
            },
            { key: 'time', label: t('preview.extraTime'), value: ready ? t('preview.detourMinutes', { value: ready.extraMinutes }) : null },
          ]}
          total={
            ready
              ? t('preview.newTotal', {
                  distance: formatDistance(ready.plan.distanceM / 1000, 1),
                  duration: formatApproxDuration(ready.plan.durationS / 60).replace(/^~/, ''),
                  time: formatClockTime(new Date(now + ready.plan.durationS * 1000)),
                })
              : detour.status === 'error'
                ? t('preview.error')
                : t('preview.calculating')
          }
          warning={ready?.large ? t('preview.largeDetour') : null}
          actionLabel={t('pickOnMap.choose')}
          actionDisabled={!ready || !place || !session.canAddStop}
          onAction={choose}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  back: {
    position: 'absolute',
    left: layout.screenGutter,
  },
  // The pin tip sits on the centre of the map area above the panel.
  centerPinWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: PIN.height,
  },
  centerPin: {
    width: PIN.width,
    height: PIN.height,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
  },
  hint: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapPin,
  },
  hintLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.brand,
  },
});
