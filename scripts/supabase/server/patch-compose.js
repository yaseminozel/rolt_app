// Adds ROLT's auth and functions settings to the Supabase compose file (idempotent).
// usage: node patch-compose.js <docker-compose.yml>
const fs = require('fs');
const file = process.argv[2];
let text = fs.readFileSync(file, 'utf8');

function insertAfter(anchor, marker, lines) {
  if (text.includes(marker)) return;
  const match = text.match(anchor);
  if (!match) throw new Error(`anchor ${anchor} not found in ${file}`);
  const indent = match[1];
  text = text.replace(anchor, match[0] + '\n' + lines.map((line) => indent + line).join('\n'));
}

insertAfter(/^( +)GOTRUE_SMS_AUTOCONFIRM: \$\{ENABLE_PHONE_AUTOCONFIRM\}$/m, 'GOTRUE_HOOK_SEND_EMAIL_URI', [
  '# ROLT (scripts/supabase/configure-server.sh)',
  'GOTRUE_MAILER_ALLOW_UNVERIFIED_EMAIL_SIGN_INS: ${MAILER_ALLOW_UNVERIFIED_EMAIL_SIGN_INS:-false}',
  'GOTRUE_MAILER_OTP_EXP: ${MAILER_OTP_EXP:-3600}',
  'GOTRUE_PASSWORD_MIN_LENGTH: 8',
  'GOTRUE_MAILER_NOTIFICATIONS_PASSWORD_CHANGED_ENABLED: "true"',
  'GOTRUE_HOOK_SEND_EMAIL_ENABLED: "true"',
  'GOTRUE_HOOK_SEND_EMAIL_URI: ${API_EXTERNAL_URL}/functions/v1/auth-email',
  'GOTRUE_HOOK_SEND_EMAIL_SECRETS: ${AUTH_EMAIL_HOOK_SECRET}',
  'GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED: "true"',
  'GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI: pg-functions://postgres/public/hook_password_verification_attempt',
  'GOTRUE_EXTERNAL_GOOGLE_ENABLED: ${GOOGLE_ENABLED:-false}',
  'GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}',
  'GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOOGLE_SECRET:-}',
  'GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: ${API_EXTERNAL_URL}/auth/v1/callback',
  'GOTRUE_EXTERNAL_APPLE_ENABLED: ${APPLE_ENABLED:-false}',
  'GOTRUE_EXTERNAL_APPLE_CLIENT_ID: ${APPLE_CLIENT_ID:-}',
  'GOTRUE_EXTERNAL_APPLE_SECRET: ${APPLE_SECRET:-}',
  'GOTRUE_EXTERNAL_APPLE_REDIRECT_URI: ${API_EXTERNAL_URL}/auth/v1/callback',
]);

insertAfter(/^( +)VERIFY_JWT: "?\$\{FUNCTIONS_VERIFY_JWT\}"?$/m, 'INTERNAL_HOOK_SECRET', [
  'RESEND_API_KEY: ${RESEND_API_KEY:-}',
  'EMAIL_FROM: ${EMAIL_FROM:-}',
  'EMAIL_REPLY_TO: ${EMAIL_REPLY_TO:-}',
  'AUTH_EMAIL_HOOK_SECRET: ${AUTH_EMAIL_HOOK_SECRET:-}',
  'INTERNAL_HOOK_SECRET: ${INTERNAL_HOOK_SECRET:-}',
  'EXPO_ACCESS_TOKEN: ${EXPO_ACCESS_TOKEN:-}',
]);

fs.writeFileSync(file, text);
