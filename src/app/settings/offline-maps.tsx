import { Stack } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button } from '@/components/ui/Button';
import { haptics } from '@/features/haptics/haptics';
import { offlineMaps, useOfflineMaps, type OfflineMap } from '@/features/offlineMaps/offlineMaps';
import { formatDateTime, formatNumber } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const BYTES_PER_MB = 1024 * 1024;

/**
 * Ayarlar › Çevrimdışı haritalar (not drawn; user decision 2026-10-09, laid out like 10.06
 * Engellenenler): the downloaded route maps with their size, and "Sil" for each.
 */
export default function OfflineMapsScreen() {
  const { t } = useTranslation('settings');
  const { showToast } = useToast();
  const maps = useOfflineMaps().filter((map) => map.state !== 'failed');

  const size = (bytes: number) =>
    t('offlineMaps.megabytes', {
      value: formatNumber(bytes / BYTES_PER_MB, { maximumFractionDigits: bytes < 10 * BYTES_PER_MB ? 1 : 0 }),
    });
  const detail = (map: OfflineMap) =>
    map.state === 'downloading' || map.downloadedAt === null
      ? t('offlineMaps.downloading', { percent: formatNumber(Math.round(map.progress * 100)) })
      : t('offlineMaps.downloadedAt', {
          date: formatDateTime(new Date(map.downloadedAt)),
          size: size(map.sizeBytes),
        });
  const total = maps.reduce((sum, map) => sum + map.sizeBytes, 0);

  return (
    <>
      <Stack.Screen options={{ title: t('offlineMaps.title') }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.description}>{t('offlineMaps.description')}</Text>
        {maps.length === 0 ? (
          <EmptyState
            title={t('offlineMaps.emptyTitle')}
            description={t('offlineMaps.emptyDescription')}
            style={styles.empty}
          />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('offlineMaps.count', { count: maps.length, size: size(total) })}
            </Text>
            <View style={styles.card}>
              {maps.map((map, index) => (
                <Fragment key={map.routeId}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.row}>
                    <View style={styles.identity}>
                      <Text style={styles.name} numberOfLines={1}>
                        {map.route.name}
                      </Text>
                      <Text style={styles.detail} numberOfLines={1}>
                        {detail(map)}
                      </Text>
                    </View>
                    <Button
                      variant="outlined"
                      destructive
                      label={t('offlineMaps.remove')}
                      onPress={() => {
                        haptics.press();
                        offlineMaps.remove(map.routeId);
                        showToast({
                          variant: 'success',
                          message: t('offlineMaps.removed', { name: map.route.name }),
                        });
                      }}
                    />
                  </View>
                </Fragment>
              ))}
            </View>
          </View>
        )}
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
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  description: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  empty: {
    paddingTop: spacing.xl,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...typography.eyebrow,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
