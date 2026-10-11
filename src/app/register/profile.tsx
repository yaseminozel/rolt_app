import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { ProfilePhotoPicker } from '@/components/registration/ProfilePhotoPicker';
import { RegistrationStepScreen } from '@/components/registration/RegistrationStepScreen';
import { UsernameField } from '@/components/registration/UsernameField';
import { TextField } from '@/components/ui/TextField';
import { spacing } from '@/theme';
import { findModel } from '@/features/garage/fixtures/motorcycleModels';
import { findCityByName } from '@/features/location/turkishCities';
import type { Place } from '@/features/route-suggestion/types';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/features/registration/usernameService';
import {
  useUsernameAvailability,
  type UsernameStatus,
} from '@/features/registration/useUsernameAvailability';

/**
 * 04.01 Kayıt tamamlama / Profil (Pencil `Xgwyg` empty, `jmuyH` available, `Citg6` taken).
 * "Devam et" needs a full name and an available username; the photo is optional and "Atla"
 * moves on without saving. A taken username shows up to three free suggestions, personalised
 * with the plate code of the 04.02 place and the bike when the user came back from a later
 * step; tapping one fills the field and re-checks it.
 */
export default function RegisterProfileScreen() {
  const { t } = useTranslation(['registration', 'common']);
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();

  const [photoUri, setPhotoUri] = useState(draft.photoUri);
  const [fullName, setFullName] = useState(draft.fullName ?? '');
  const [username, setUsername] = useState(draft.username ?? '');
  const usernameStatus = useUsernameAvailability(username, {
    cityPlateCode: homeProvince(draft.homePlace)?.plateCode,
    bikeModelName: findModel(draft.modelId)?.name,
  });

  const canContinue = fullName.trim().length > 0 && usernameStatus.state === 'available';

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profile.photoPermissionTitle'), t('profile.photoPermissionMessage'), [
        { text: t('profile.photoPermissionCancel'), style: 'cancel' },
        {
          text: t('profile.photoPermissionOpenSettings'),
          onPress: () => Linking.openSettings(),
        },
      ]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // Full quality: the upload step resizes and re-encodes once (`src/lib/media/prepareImage.ts`).
      quality: 1,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) {
      setPhotoUri(asset.uri);
    }
  };

  const handleContinue = () => {
    updateDraft({ photoUri, fullName: fullName.trim(), username });
    router.push('/register/location');
  };

  return (
    <RegistrationStepScreen
      step={1}
      heading={t('profile.heading')}
      description={t('profile.description')}
      ctaLabel={t('common:actions.continue')}
      onCtaPress={handleContinue}
      ctaDisabled={!canContinue}
      onSkip={() => router.push('/register/location')}>
      <View style={styles.body}>
        <ProfilePhotoPicker
          photoUri={photoUri}
          title={photoUri ? t('profile.photoTitleSet') : t('profile.photoTitle')}
          description={photoUri ? t('profile.photoDescriptionSet') : t('profile.photoDescription')}
          onPress={pickPhoto}
        />
        <View style={[styles.fields, usernameStatus.state === 'taken' && styles.fieldsTaken]}>
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
            placeholder={t('profile.usernamePlaceholder')}
            suggestions={usernameStatus.state === 'taken' ? usernameStatus.suggestions : undefined}
            suggestionsTitle={t('profile.usernameSuggestionsTitle')}
            formatSuggestion={(suggestion) => t('usernameHandle', { username: suggestion })}
            onSuggestionPress={setUsername}
            suggestionsAccessibilityLabel={t('profile.usernameSuggestionsLabel')}
            suggestionAccessibilityHint={t('profile.usernameSuggestionHint')}
          />
        </View>
      </View>
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
          return {
            errorText: t('profile.usernameTooShort', {
              min: USERNAME_MIN_LENGTH,
            }),
          };
        case 'tooLong':
          return {
            errorText: t('profile.usernameTooLong', {
              max: USERNAME_MAX_LENGTH,
            }),
          };
      }
      break;
    case 'idle':
      return { helperText: t('profile.usernameHelper') };
  }
  return {};
}

/** Province of the 04.02 place ("Kemer, Antalya, Türkiye" → Antalya) for plate-code suggestions. */
function homeProvince(place: Place | undefined) {
  if (!place) {
    return undefined;
  }
  const parts = [place.name, ...(place.subtitle?.split(',') ?? [])].map((part) => part.trim());
  return parts.map(findCityByName).find(Boolean);
}

const styles = StyleSheet.create({
  // "Frame 66": photo → fields 24.
  body: {
    gap: spacing.xxl,
  },
  fields: {
    gap: spacing.lg,
  },
  // The taken state spaces its fields 20 apart (`Citg6` "Fields").
  fieldsTaken: {
    gap: spacing.xl,
  },
});
