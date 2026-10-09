import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback/ToastProvider';
import { ProfilePhotoPicker } from '@/components/registration/ProfilePhotoPicker';
import { SelectField } from '@/components/ride-form/SelectField';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { editProfileCity, usePickedCity } from '@/features/profile/EditProfileDraft';
import { profileLinkLabel } from '@/features/profile/profileLink';
import { useOwnProfile, useUpdateOwnProfile } from '@/features/profile/queries';
import type { OwnProfile } from '@/features/profile/types';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/features/registration/usernameService';
import { useUsernameAvailability } from '@/features/registration/useUsernameAvailability';
import { colors, layout, spacing, typography } from '@/theme';

const BIO_MAX = 160;
/** "Field / Biyografi": 79 pt box like the other short notes fields. */
const BIO_HEIGHT = 79;
const COUNTRY_SUFFIX = 'Türkiye';

/**
 * 09.05 Profili düzenle (Figma `1005:35794`, "Kullanıcı adı alınmış" `1005:35814`): photo, name,
 * username with its profile link, bio and city; "Kaydet" stores them on the own profile.
 * A username already taken shows the first free alternative as an example.
 */
export default function EditProfileScreen() {
  const { data: profile } = useOwnProfile();

  // A city picked during an earlier visit doesn't carry over.
  useEffect(() => editProfileCity.set(null), []);

  return profile ? <EditProfileForm profile={profile} /> : null;
}

function EditProfileForm({ profile }: { profile: OwnProfile }) {
  const { t } = useTranslation(['profile', 'registration']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const update = useUpdateOwnProfile();
  const pickedCity = usePickedCity();

  const [photoUri, setPhotoUri] = useState(profile.photoUri);
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio ?? '');
  const city = pickedCity ? `${pickedCity}, ${COUNTRY_SUFFIX}` : (profile.city ?? '');

  const ownHandle = profile.handle;
  const changedHandle = handle !== ownHandle ? handle : '';
  const status = useUsernameAvailability(changedHandle);

  let usernameError: string | undefined;
  if (changedHandle) {
    if (status.state === 'taken') {
      const example = status.suggestions[0];
      usernameError = example
        ? t('edit.usernameTakenExample', { example })
        : t('edit.usernameTaken');
    } else if (status.state === 'invalid') {
      usernameError = t(`registration:profile.${INVALID_KEYS[status.error]}`, {
        min: USERNAME_MIN_LENGTH,
        max: USERNAME_MAX_LENGTH,
      });
    } else if (status.state === 'failed') {
      usernameError = t('registration:profile.usernameCheckFailed');
    }
  }
  const handleReady = !changedHandle || status.state === 'available';
  const canSave = name.trim().length > 0 && handle.length > 0 && handleReady;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    try {
      await update.mutateAsync({
        photoUri,
        name: name.trim(),
        handle,
        bio: bio.trim() || undefined,
        city: city || undefined,
      });
      showToast({ variant: 'success', message: t('edit.saved') });
      router.back();
    } catch {
      showToast({ variant: 'failure', message: t('edit.failed') });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('edit.title') }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <ProfilePhotoPicker
            photoUri={photoUri}
            photoSource={photoUri ? undefined : profile.sampleAvatar}
            title={t('edit.photoTitle')}
            description={t('edit.photoDescription')}
            onPress={pickPhoto}
          />
          <View style={styles.fields}>
            <TextField
              label={t('edit.name')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <TextField
              label={t('edit.username')}
              prefix={t('registration:profile.usernamePrefix')}
              value={handle}
              onChangeText={(text) => setHandle(text.toLowerCase().replace(/\s/g, ''))}
              maxLength={USERNAME_MAX_LENGTH}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              helperText={t('edit.profileLink', { link: profileLinkLabel(handle || ownHandle) })}
              errorText={usernameError}
              errorHaptic={false}
            />
            <TextField
              type="multiline"
              label={t('edit.bio')}
              value={bio}
              onChangeText={setBio}
              maxLength={BIO_MAX}
              multilineHeight={BIO_HEIGHT}
              placeholder={t('edit.bioPlaceholder')}
            />
            <View style={styles.field}>
              <Text style={styles.label}>{t('edit.city')}</Text>
              <SelectField
                value={city}
                placeholder={t('edit.cityPlaceholder')}
                accessibilityLabel={t('edit.city')}
                onPress={() => router.push('/edit-profile/city')}
              />
            </View>
          </View>
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            label={t('edit.save')}
            disabled={!canSave}
            loading={update.isPending}
            onPress={save}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const INVALID_KEYS = {
  invalidCharacters: 'usernameInvalidCharacters',
  tooShort: 'usernameTooShort',
  tooLong: 'usernameTooLong',
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  fields: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  bar: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
