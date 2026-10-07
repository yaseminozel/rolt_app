import { Modal, StyleSheet, View } from 'react-native';

import { colors, layout } from '@/theme';

import { Dialog, type DialogProps } from './Dialog';

type DialogModalProps = DialogProps & {
  visible: boolean;
  /** Android back button and the system dismiss gesture. */
  onRequestClose: () => void;
  /** iOS: the modal finished hiding (navigate away only after this, see RN `Modal.onDismiss`). */
  onDismiss?: () => void;
};

/** `Dialog` centred over a dimmed screen (08.09 "Sürüşü sil", 08.10 "Kaydetmeden çık"). */
export function DialogModal({ visible, onRequestClose, onDismiss, ...dialog }: DialogModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
      onDismiss={onDismiss}>
      <View style={styles.scrim}>
        <Dialog {...dialog} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.dialogScrim,
  },
});
