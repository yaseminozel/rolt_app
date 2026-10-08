import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/feedback/ToastProvider';
import { ShareTargets } from '@/components/ride-form/ShareTargets';
import {
  SHARE_TEMPLATES,
  ShareTemplateCard,
  TEMPLATE_SIZE,
  type ShareRideData,
  type ShareTemplate,
} from '@/components/share/ShareTemplateCard';
import { Button } from '@/components/ui/Button';
import { useRiderRides } from '@/features/riders/queries';
import { useRideRecord } from '@/features/rides/queries';
import { rideTitle } from '@/features/rides/rideTitle';
import { shareTemplateImage, SHARE_IMAGE_SIZE } from '@/features/rides/shareImage';
import { rideLink, type ShareTarget } from '@/features/rides/shareRide';
import { formatCompactDuration, formatDistance } from '@/i18n/format';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';
import { colors, fontFamily, layout, spacing } from '@/theme';

/** The export is drawn this many times the card size, then saved at 1080 × 1920. */
const EXPORT_SCALE = 360 / TEMPLATE_SIZE.width;

/**
 * 09.03 Profil / Aktiviteyi paylaş — Karusel (Pencil `M2scbg`): "Sürüşü paylaş" with the share
 * templates (map, transparent, photo when the ride has one, brand), the targets and "Paylaş".
 * The chosen template is rendered off screen at story size and shared as a PNG; "Bağlantı
 * Kopyala" copies the ride link. Works for recorded rides (`source=device`) and the sample
 * account's rides (`source=sample&riderId=…`).
 */
export default function ShareRideSheet() {
  const { t } = useTranslation(['rides', 'profile']);
  const { showToast } = useToast();
  const { rideId, source, riderId } = useLocalSearchParams<{
    rideId: string;
    source?: 'device' | 'sample';
    riderId?: string;
  }>();
  const deviceRide = useRideRecord(source === 'sample' ? undefined : rideId);
  const sampleRides = useRiderRides(source === 'sample' ? riderId : undefined);
  const bottomPadding = useSheetBottomPadding((inset) => inset + spacing.lg);
  const exportRef = useRef<View>(null);
  const [template, setTemplate] = useState<ShareTemplate>('map');
  const [sharing, setSharing] = useState(false);

  const data = useMemo<ShareRideData | null>(() => {
    if (source === 'sample') {
      const ride = sampleRides.data?.find((item) => item.id === rideId);
      return ride
        ? {
            title: ride.title,
            distanceKm: ride.distanceKm,
            durationMinutes: ride.durationMinutes,
            mapImage: ride.mapImage,
            photo: ride.photos[0],
          }
        : null;
    }
    const ride = deviceRide.data;
    if (!ride) {
      return null;
    }
    const photo = ride.photos.find((item) => item.status === 'uploaded');
    return {
      title: rideTitle(ride),
      distanceKm: ride.stats.distanceM / 1000,
      durationMinutes: ride.stats.durationS / 60,
      track: ride.track,
      photo: photo ? { uri: photo.uri } : undefined,
    };
  }, [deviceRide.data, rideId, sampleRides.data, source]);

  const templates = SHARE_TEMPLATES.filter((item) => item !== 'photo' || data?.photo);
  const message = data
    ? t('share.message', {
        title: data.title,
        distance: formatDistance(data.distanceKm, 1),
        duration: formatCompactDuration(data.durationMinutes),
        link: rideLink(rideId),
      })
    : '';

  const shareImage = async () => {
    setSharing(true);
    try {
      await shareTemplateImage(exportRef, message);
    } catch {
      showToast({ variant: 'failure', message: t('shareSheet.failed') });
    } finally {
      setSharing(false);
    }
  };

  const onTarget = async (target: ShareTarget) => {
    if (target === 'copyLink') {
      await Clipboard.setStringAsync(rideLink(rideId));
      showToast({ variant: 'success', message: t('saved.linkCopied') });
      return;
    }
    await shareImage();
  };

  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
      <Text style={styles.title} accessibilityRole="header">
        {t('shareSheet.title')}
      </Text>
      {data ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            style={styles.carouselScroll}>
            {templates.map((item) => (
              <Pressable
                key={item}
                onPress={() => setTemplate(item)}
                accessibilityRole="radio"
                accessibilityState={{ selected: template === item }}
                accessibilityLabel={t(`shareSheet.templates.${item}`)}>
                <ShareTemplateCard template={item} ride={data} selected={template === item} />
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.targets}>
            <ShareTargets onShare={onTarget} />
          </View>
          <View style={styles.action}>
            <Button size="lg" label={t('shareSheet.share')} loading={sharing} onPress={shareImage} />
          </View>
          {/* Off-screen, story-sized copy of the chosen template: what is captured and shared. */}
          <View style={styles.exportStage} pointerEvents="none" importantForAccessibility="no-hide-descendants">
            <ShareTemplateCard ref={exportRef} template={template} ride={data} scale={EXPORT_SCALE} forExport />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    paddingHorizontal: layout.screenGutter,
    paddingTop: 18 + spacing.lg,
    paddingBottom: 18,
  },
  carouselScroll: {
    flexGrow: 0,
  },
  carousel: {
    gap: spacing.md,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  targets: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.sm,
  },
  action: {
    padding: layout.screenGutter,
  },
  exportStage: {
    position: 'absolute',
    top: 0,
    left: -10_000,
    width: SHARE_IMAGE_SIZE.width,
  },
});
