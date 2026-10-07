import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RideMapPreview } from '@/components/record/RideMapPreview';
import type { BoxPadding } from '@/components/route-builder/routeProjection';
import { ChoiceRow } from '@/components/ride-form/ChoiceRow';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { useSavedRides } from '@/features/rides/queries';
import { ROUTE_FIXTURES } from '@/features/routes/fixtures/routes';
import {
  DEFAULT_ENDPOINT_PRIVACY,
  settingsKeys,
  useEndpointPrivacy,
  writeEndpointPrivacy,
  type EndpointPrivacy,
} from '@/features/settings/privacySettings';
import { formatDistance, formatElevation } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const DISTANCES: readonly EndpointPrivacy['distanceM'][] = [100, 250, 500, 1000];
const PREVIEW_PADDING: BoxPadding = { top: 44, right: 40, bottom: 28, left: 40 };
/** Example track when the rider hasn't recorded a ride yet. */
const SAMPLE_ROUTE_ID = 'geyikbayiri';

/**
 * 10.05 Başlangıç-bitiş noktası (Pencil `h9Src3`): hide the first and last part of every ride on
 * maps, with a preview on the rider's latest ride (or a sample route) and the distance to hide.
 * The design's "Kısa açıklama satırı" placeholders under the distances are left out.
 */
export default function EndpointPrivacyScreen() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { data: privacy = DEFAULT_ENDPOINT_PRIVACY } = useEndpointPrivacy();
  const { data: rides } = useSavedRides();
  const update = useMutation({
    mutationFn: writeEndpointPrivacy,
    onMutate: (next) => queryClient.setQueryData(settingsKeys.endpointPrivacy, next),
  });

  const track = rides?.find((ride) => ride.track.length > 0)?.track ?? [
    ROUTE_FIXTURES.find((route) => route.id === SAMPLE_ROUTE_ID)?.coordinates ?? [],
  ];

  const distanceLabel = (metres: number) =>
    metres >= 1000 ? formatDistance(metres / 1000) : formatElevation(metres);

  return (
    <>
      <Stack.Screen options={{ title: t('endpoints.title') }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title} accessibilityRole="header">
            {t('endpoints.heading')}
          </Text>
          <Text style={styles.description}>{t('endpoints.description')}</Text>
        </View>

        <RideMapPreview
          track={track}
          padding={PREVIEW_PADDING}
          trackColor={colors.textPrimary}
          hiddenEnds={
            privacy.hidden
              ? {
                  metres: privacy.distanceM,
                  startLabel: t('endpoints.startHidden'),
                  finishLabel: t('endpoints.finishHidden'),
                }
              : undefined
          }
          style={styles.preview}
        />

        <View style={styles.card}>
          <SettingsRow
            label={t('endpoints.toggle')}
            description={t('endpoints.toggleHint')}
            trailing="switch"
            switchValue={privacy.hidden}
            onSwitchValueChange={(hidden) => update.mutate({ ...privacy, hidden })}
          />
        </View>

        <View
          style={[styles.section, !privacy.hidden && styles.disabled]}
          pointerEvents={privacy.hidden ? 'auto' : 'none'}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('endpoints.distanceTitle')}
          </Text>
          <View style={[styles.card, styles.options]} accessibilityRole="radiogroup">
            {DISTANCES.map((metres, index) => (
              <Fragment key={metres}>
                <ChoiceRow
                  label={distanceLabel(metres)}
                  selected={privacy.distanceM === metres}
                  divided={index > 0}
                  onPress={() => update.mutate({ ...privacy, distanceM: metres })}
                />
              </Fragment>
            ))}
          </View>
        </View>

        <Text style={styles.footnote}>{t('endpoints.footnote')}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  heading: {
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  preview: {
    height: 132,
    borderRadius: radius.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  options: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  footnote: {
    ...typography.caption,
    lineHeight: 17,
    color: colors.textSecondary,
  },
});
