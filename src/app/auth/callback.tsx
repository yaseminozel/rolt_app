import { Redirect } from 'expo-router';

/**
 * Landing route of the Google / Apple browser sign-in (`rolt://auth/callback?code=…`). The auth
 * session sheet reads the code itself; when the system also opens the link in the app (Android),
 * this only hands over to the entry point.
 */
export default function AuthCallbackScreen() {
  return <Redirect href="/" />;
}
