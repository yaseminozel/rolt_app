import * as SecureStore from 'expo-secure-store';

const KEY = 'rolt.backgroundLocationPromptShown';

/**
 * The background location explainer (06.04) is shown once, on the first "Başla" with
 * foreground-only access (note `E0DAxE`).
 */
export async function wasBackgroundPromptShown() {
  try {
    return (await SecureStore.getItemAsync(KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markBackgroundPromptShown() {
  try {
    await SecureStore.setItemAsync(KEY, 'true');
  } catch {
    // Best effort: at worst the explainer shows once more.
  }
}
