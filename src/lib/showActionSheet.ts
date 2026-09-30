import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type ActionSheetOption = {
  label: string;
  onPress: () => void;
  /** Red label for harmful actions such as "Engelle". */
  destructive?: boolean;
};

type ActionSheetParams = {
  options: ActionSheetOption[];
  cancelLabel: string;
  title?: string;
};

/**
 * Native option list for menus without a design (e.g. the profile "…" menu):
 * `ActionSheetIOS` on iOS, a cancelable `Alert` with one button per option on Android.
 * Android alerts hold at most three buttons, so pass no more than two options.
 */
export function showActionSheet({ options, cancelLabel, title }: ActionSheetParams) {
  if (Platform.OS === 'ios') {
    const destructiveButtonIndex = options.flatMap((option, index) => (option.destructive ? [index] : []));
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((option) => option.label), cancelLabel],
        cancelButtonIndex: options.length,
        destructiveButtonIndex,
      },
      (index) => options[index]?.onPress(),
    );
    return;
  }

  Alert.alert(
    title ?? '',
    undefined,
    [
      ...options.map((option) => ({
        text: option.label,
        onPress: option.onPress,
        style: option.destructive ? ('destructive' as const) : ('default' as const),
      })),
      { text: cancelLabel, style: 'cancel' as const },
    ],
    { cancelable: true },
  );
}
