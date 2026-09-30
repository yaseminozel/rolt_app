import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking } from 'react-native';

import { ProfilePhotoPicker } from '@/components/registration/ProfilePhotoPicker';
import { RegistrationStepScreen } from '@/components/registration/RegistrationStepScreen';
import { SelectField } from '@/components/registration/SelectField';
import { UsernameField } from '@/components/registration/UsernameField';
import { TextField } from '@/components/ui/TextField';
import { findModel } from '@/features/garage/fixtures/motorcycleModels';
import { findCityByName } from '@/features/location/turkishCities';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/features/registration/usernameService';
import {
  useUsernameAvailability,
  type UsernameStatus,
} from '@/features/registration/useUsernameAvailability';

/**
 * 00.8 Kayıt / 1 · Profil (Pencil `UZpFX`; taken username `eIU92`).
 * Required: full name + an available username (the design hides "Atla" on this step).
 * Photo and city are optional. A taken username shows up to three free suggestions,
 * personalised with the chosen city's plate code (and the bike, when the user came back
 * from a later step); tapping one fills the field and re-checks it.
 */
export default function RegisterProfileScreen() {
  const { t } = useTranslation(['registration', 'common']);
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();

  const [photoUri, setPhotoUri] = useState(draft.photoUri);
  const [fullName, setFullName] = useState(draft.fullName ?? '');
  const [username, setUsername] = useState(draft.username ?? '');
  const usernameStatus = useUsernameAvailability(username, {
    cityPlateCode: findCityByName(draft.city)?.plateCode,
    bikeModelName: findModel(draft.modelId)?.name ?? draft.customModelName,
  });

  const canContinue = fullName.trim().length > 0 && usernameStatus.state === 'available';

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profile.photoPermissionTitle'), t('profile.photoPermissionMessage'), [
        { text: t('profile.photoPermissionCancel'), style: 'cancel' },
        { text: t('profile.photoPermissionOpenSettings'), onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) {
      setPhotoUri(asset.uri);
    }
  };

  const handleContinue = () => {
    updateDraft({ photoUri, fullName: fullName.trim(), username });
    router.push('/register/brand');
  };

  return (
    <RegistrationStepScreen
      step={1}
      heading={t('profile.heading')}
      description={t('profile.description')}
      ctaLabel={t('common:actions.continue')}
      onCtaPress={handleContinue}
      ctaDisabled={!canContinue}>
      <ProfilePhotoPicker
        photoUri={photoUri}
        title={photoUri ? t('profile.photoTitleChange') : t('profile.photoTitle')}
        description={t('profile.photoDescription')}
        onPress={pickPhoto}
      />
      <TextField
        label={t('profile.fullNameLabel')}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
      <UsernameField
        label={t('profile.usernameLabel')}
        prefix={t('profile.usernamePrefix')}
        value={username}
        onChangeText={(text) => setUsername(text.toLowerCase().replace(/\s/g, ''))}
        maxLength={USERNAME_MAX_LENGTH}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        returnKeyType="done"
        {...usernameMessages(usernameStatus, t)}
        suggestions={usernameStatus.state === 'taken' ? usernameStatus.suggestions : undefined}
        formatSuggestion={(suggestion) => t('usernameHandle', { username: suggestion })}
        onSuggestionPress={setUsername}
        suggestionsAccessibilityLabel={t('profile.usernameSuggestionsLabel')}
        suggestionAccessibilityHint={t('profile.usernameSuggestionHint')}
      />
      <SelectField
        label={t('profile.cityLabel')}
        value={draft.city ?? ''}
        placeholder={t('profile.cityPlaceholder')}
        helperText={t('profile.cityHelper')}
        onPress={() => router.push('/register/city')}
      />
    </RegistrationStepScreen>
  );
}

/** Maps the availability status to TextField helper / success / error text. */
function usernameMessages(status: UsernameStatus, t: TFunction<'registration'>) {
  switch (status.state) {
    case 'checking':
      return { helperText: t('profile.usernameChecking') };
    case 'available':
      return { successText: t('profile.usernameAvailable') };
    case 'taken':
      return { errorText: t('profile.usernameTaken') };
    case 'failed':
      return { errorText: t('profile.usernameCheckFailed') };
    case 'invalid':
      switch (status.error) {
        case 'invalidCharacters':
          return { errorText: t('profile.usernameInvalidCharacters') };
        case 'tooShort':
          return { errorText: t('profile.usernameTooShort', { min: USERNAME_MIN_LENGTH }) };
        case 'tooLong':
          return { errorText: t('profile.usernameTooLong', { max: USERNAME_MAX_LENGTH }) };
      }
      break;
    case 'idle':
      break;
  }
  return {};
}
