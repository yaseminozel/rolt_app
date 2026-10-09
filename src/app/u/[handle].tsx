import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam } from '@/features/auth/credentials';
import { supabase, unwrap } from '@/lib/supabase/client';
import { colors } from '@/theme';

/**
 * Target of a profile share link (09.02): https://roltapp.com/u/<handle> opens
 * rolt://u/<handle>, which resolves the username and shows that rider's profile (or the own
 * profile tab for one's own link).
 */
export default function ProfileLinkScreen() {
  const { t } = useTranslation('common');
  const params = useLocalSearchParams<{ handle?: string | string[] }>();
  const handle = firstParam(params.handle).replace(/^@/, '');
  const { session } = useAuth();
  const { data: riderId, isPending } = useQuery({
    queryKey: ['riders', 'byHandle', handle],
    queryFn: async () => unwrap(await supabase.rpc('rider_id_by_handle', { p_handle: handle })),
    enabled: handle.length > 0,
  });

  if (handle.length > 0 && isPending) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }
  if (!riderId) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title={t('profileLink.notFound.title')}
          description={t('profileLink.notFound.description')}
        />
      </View>
    );
  }
  if (riderId === session?.userId) {
    return <Redirect href="/profile" />;
  }
  return <Redirect href={{ pathname: '/rider/[id]', params: { id: riderId } }} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
