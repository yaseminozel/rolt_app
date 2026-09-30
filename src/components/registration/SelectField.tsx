import { NavArrowDown } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/ui/TextField';
import { colors, spacing, typography } from '@/theme';

/** Height of the TextField box; the chevron is centred on it. */
const FIELD_HEIGHT = 44;

type SelectFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  helperText?: string;
  onPress: () => void;
};

/**
 * Read-only picker field ("Şehir" on UZpFX): `TextField type="select"` look with a bare
 * trailing chevron that opens a picker instead of the keyboard. TextField has no
 * non-editable/pressable mode and its Select type draws a divider + unit suffix, so this
 * wraps it: the field ignores touches and the whole block is one button.
 */
export function SelectField({ label, value, placeholder, helperText, onPress }: SelectFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value || placeholder }}
        accessibilityHint={helperText}>
        <View style={styles.passThrough} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <TextField
            type="select"
            value={value}
            onChangeText={noop}
            placeholder={placeholder}
            helperText={helperText}
            showSoftInputOnFocus={false}
            caretHidden
          />
          <View style={styles.chevron}>
            <NavArrowDown width={20} height={20} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function noop() {}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  passThrough: {
    pointerEvents: 'none',
  },
  chevron: {
    position: 'absolute',
    top: 0,
    right: spacing.md,
    height: FIELD_HEIGHT,
    justifyContent: 'center',
  },
});
