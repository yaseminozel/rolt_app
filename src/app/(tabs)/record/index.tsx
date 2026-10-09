import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { lastTabPath } from '@/features/rides/recordSheet';
import { colors } from '@/theme';

/**
 * The Kaydet tab has no page of its own: it opens the record sheet (`/record-ride`, 08.01). iOS
 * never selects it (disabled trigger); when Android or a link does, this hands over to the sheet
 * and puts the previous tab back underneath it.
 */
export default function RecordTabScreen() {
  useFocusEffect(
    useCallback(() => {
      router.navigate(lastTabPath());
      router.push('/record-ride');
    }, []),
  );
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
