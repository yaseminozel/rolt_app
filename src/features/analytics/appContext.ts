import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { deviceStore } from '@/lib/deviceStore';

/**
 * Who and what sent a telemetry row (`app_events`, `app_errors`): a random id per installation and
 * per launch plus the app and OS versions. Nothing personal — no device name, no account email.
 */
export type AppContextFields = {
  install_id: string;
  session_id: string;
  platform: string;
  os_version: string | null;
  app_version: string | null;
  build_version: string | null;
  runtime_version: string | null;
  update_id: string | null;
  device_model: string | null;
  is_dev: boolean;
};

const INSTALL_ID_KEY = 'rolt.telemetry.installId';

export const randomId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

/** Clips a value to a column's length limit; empty becomes `null`. */
export const clip = (value: unknown, max: number): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value);
  return text.length === 0 ? null : text.slice(0, max);
};

function readInstallId() {
  try {
    const stored = deviceStore.getSync(INSTALL_ID_KEY);
    if (stored) {
      return stored;
    }
    const id = randomId();
    deviceStore.set(INSTALL_ID_KEY, id).catch(() => undefined);
    return id;
  } catch {
    return randomId();
  }
}

/** Android reports brand and model; iOS has no model without `expo-device` (not installed). */
function deviceModel() {
  if (Platform.OS === 'android') {
    const { Brand, Model } = Platform.constants;
    return clip([Brand, Model].filter(Boolean).join(' '), 64);
  }
  return null;
}

let fields: AppContextFields | null = null;

export function appContextFields(): AppContextFields {
  fields ??= {
    install_id: readInstallId(),
    session_id: randomId(),
    platform: Platform.OS,
    os_version: clip(Platform.Version, 32),
    app_version: clip(Constants.expoConfig?.version, 32),
    build_version: clip(Platform.OS === 'ios' ? Constants.platform?.ios?.buildNumber : null, 32),
    runtime_version: clip(Updates.runtimeVersion, 128),
    update_id: clip(Updates.updateId, 64),
    device_model: deviceModel(),
    is_dev: __DEV__,
  };
  return fields;
}
