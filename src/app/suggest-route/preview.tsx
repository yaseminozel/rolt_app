import { Redirect, router, Stack, type Href } from 'expo-router';
import { ShieldCheck } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoutePreviewMap } from '@/components/route-builder/RoutePreviewMap';
import { RouteSummaryCard, type RouteSummaryMetric } from '@/components/route-builder/RouteSummaryCard';
import { Button } from '@/components/ui/Button';
import { StepProgress } from '@/components/ui/StepProgress';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { formatDistance, formatDuration, formatElevation } from '@/i18n/format';
import { colors, layout, spacing, typography } from '@/theme';

/** Steps of the flow's indicator: location (04.1), details (04.2), preview (04.3). */
const FLOW_STEP_COUNT = 3;
const MAP_HEIGHT = 150;
/** Content column of 04.3 ("İçerik", padding [20, 32]); the CTA bar keeps the 16 pt gutter. */
const CONTENT_INSET = spacing.xxxl;

/**
 * 04.3 Önizleme (`V62ZC`): last check before sending. "Düzenle" returns to the details step,
 * "Haritada düzenle" opens the map editor, "Rotayı gönder" replaces this screen with sending
 * so back can't return here mid-upload.
 */
export default function SuggestRoutePreviewScreen() {
  const { t } = useTranslation('routeSuggestionReview');
  const insets = useSafeAreaInsets();
  const { draft } = useRouteSuggestion();

  // Nothing to preview without a calculated line (e.g. the screen was restored on its own).
  if (!draft.preview) {
    return <Redirect href="/suggest-route" />;
  }

  const { preview } = draft;
  const path = draft.waypoints.flatMap((waypoint) => (waypoint.place ? [waypoint.place.name] : []));
  const metrics: RouteSummaryMetric[] = [
    { key: 'distance', label: t('preview.metrics.distance'), value: formatDistance(preview.distanceKm) },
    { key: 'duration', label: t('preview.metrics.duration'), value: formatDuration(preview.durationMinutes) },
    ...(preview.elevationGainM !== undefined
      ? [{ key: 'climb', label: t('preview.metrics.climb'), value: formatElevation(preview.elevationGainM) }]
      : []),
  ];
  const description = draft.description.trim();
  const photoCount = draft.photos.length;
  const mediaLabel =
    photoCount > 0
      ? description
        ? t('preview.photosAndDescription', { photos: t('photoCount', { count: photoCount }) })
        : t('photoCount', { count: photoCount })
      : description
        ? t('preview.descriptionOnly')
        : undefined;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button
              variant="text"
              tone="brand"
              label={t('preview.edit')}
              accessibilityLabel={t('preview.editA11y')}
              onPress={() => router.dismissTo('/suggest-route/details')}
              style={styles.headerAction}
            />
          ),
        }}
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <StepProgress total={FLOW_STEP_COUNT} current={FLOW_STEP_COUNT} />
        <Text style={styles.heading} accessibilityRole="header">
          {t('preview.title')}
        </Text>
        <Text style={styles.description}>{t('preview.description')}</Text>
        <RoutePreviewMap
          preview={preview}
          waypoints={draft.waypoints}
          status="ready"
          onEdit={() => router.push('/suggest-route/edit-on-map')}
          style={styles.map}
        />
        <RouteSummaryCard
          name={draft.name}
          tags={draft.tags}
          difficulty={draft.difficulty}
          path={path}
          hiddenStopsLabel={(count) => t('preview.moreStops', { count })}
          metrics={metrics}
          photos={draft.photos.map((photo) => photo.uri)}
          mediaLabel={mediaLabel}
          description={description || undefined}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <View style={styles.legal}>
          <ShieldCheck width={13} height={13} color={colors.textSecondary} strokeWidth={1.8} />
          <Text style={styles.legalText}>
            <Trans
              t={t}
              i18nKey="preview.legal"
              components={{ rules: <LegalLink href="/legal/terms" /> }}
            />
          </Text>
        </View>
        <Button size="lg" label={t('preview.submit')} onPress={() => router.replace('/suggest-route/sending')} />
      </View>
    </View>
  );
}

/**
 * "Topluluk Kuralları" has no page of its own yet; it opens the terms of use until the
 * community guidelines are written.
 */
function LegalLink({ href, children }: { href: Href; children?: ReactNode }) {
  return (
    <Text accessibilityRole="link" onPress={() => router.push(href)} style={styles.legalLink}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: CONTENT_INSET,
  },
  heading: {
    ...typography.headlineMedium,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textBody,
  },
  map: {
    height: MAP_HEIGHT,
  },
  headerAction: {
    paddingHorizontal: spacing.md,
  },
  footer: {
    gap: 10,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
  legal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  legalText: {
    flexShrink: 1,
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
