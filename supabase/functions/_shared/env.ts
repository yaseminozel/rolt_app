// Configuration shared by the ROLT edge functions (Deno, self-hosted edge runtime).
// Values come from the functions service env in the Dokploy compose (see .env.server).

export const env = {
  /** Internal URL of the stack (kong), for server-to-server calls. */
  supabaseUrl: Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
  /** Public URL, for links in emails. */
  publicUrl: (Deno.env.get('SUPABASE_PUBLIC_URL') ?? 'https://supabase.roltapp.com').replace(/\/+$/, ''),
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  resendApiKey: Deno.env.get('RESEND_API_KEY') ?? '',
  emailFrom: Deno.env.get('EMAIL_FROM') ?? 'ROLT <noreply@roltapp.com>',
  emailReplyTo: Deno.env.get('EMAIL_REPLY_TO') ?? '',
  authEmailHookSecret: Deno.env.get('AUTH_EMAIL_HOOK_SECRET') ?? '',
  internalSecret: Deno.env.get('INTERNAL_HOOK_SECRET') ?? '',
  expoAccessToken: Deno.env.get('EXPO_ACCESS_TOKEN') ?? '',
  /** The app's URL scheme (app.json `scheme`). */
  appScheme: 'rolt',
};

export type Locale = 'tr' | 'en';

export const toLocale = (value: unknown): Locale => (value === 'en' ? 'en' : 'tr');

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** Database → function calls carry the shared secret (private.config.internal_secret). */
export function isInternalCall(req: Request) {
  const given = req.headers.get('x-rolt-secret') ?? '';
  return env.internalSecret.length > 0 && timingSafeEqual(given, env.internalSecret);
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Service-role REST call to PostgREST / GoTrue admin inside the stack. */
export async function serviceFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${env.supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  return response;
}

/** Calls a Postgres function through PostgREST with the service role. */
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const response = await serviceFetch(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error(`rpc ${name} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}
