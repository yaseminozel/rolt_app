import { env } from './env.ts';

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Resend tag for filtering in the dashboard, e.g. "auth-signup". */
  tag?: string;
  /**
   * Marketing emails only (`unsubscribeUrl` from `_shared/unsubscribe.ts`): adds the one-click
   * unsubscribe headers (RFC 8058) Gmail and Yahoo require from bulk senders.
   */
  unsubscribeUrl?: string;
};

/** Sends one email through Resend. Throws with Resend's message on failure. */
export async function sendEmail(email: OutgoingEmail) {
  if (!env.resendApiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(env.emailReplyTo ? { reply_to: env.emailReplyTo } : {}),
      ...(email.tag ? { tags: [{ name: 'category', value: email.tag }] } : {}),
      ...(email.unsubscribeUrl
        ? {
            headers: {
              'List-Unsubscribe': `<${email.unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }
        : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as { id: string };
}
