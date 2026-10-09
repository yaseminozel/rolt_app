/**
 * Control Center / Lock Screen control "Sürüş kaydet" (iOS 18+, user decision 2026-10-09): one
 * button that opens the app on the Kaydet sheet (`rolt://record-ride`). `expo-widgets` has no
 * control widgets, so this is its own widget extension built by `@bacons/apple-targets`.
 */
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'RoltControls',
  displayName: 'ROLT',
  bundleIdentifier: '.controls',
  deploymentTarget: '18.0',
  colors: {
    // ROLT blue (`colors.brand`), the tint of the control while editing it.
    $accent: '#1515FF',
  },
};
