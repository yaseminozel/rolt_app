import { StyleSheet } from 'react-native';

import { FADED_ACTION_BAR_HEIGHT, FadedActionBar } from '@/components/layout/FadedActionBar';
import { Button } from '@/components/ui/Button';

export const ROUTE_DETAIL_CTA_HEIGHT = FADED_ACTION_BAR_HEIGHT;

type RouteDetailCtaProps = {
  label: string;
  onPress: () => void;
};

/** Bottom-pinned "Rotayı sürmeye başla" (05.04 `dri86`): full-width contained button over a fade. */
export function RouteDetailCta({ label, onPress }: RouteDetailCtaProps) {
  return (
    <FadedActionBar>
      <Button label={label} onPress={onPress} style={styles.button} />
    </FadedActionBar>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
  },
});
