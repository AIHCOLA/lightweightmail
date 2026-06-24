/**
 * Email sending via MailChannels API.
 * Cloudflare Workers users can send emails for free via MailChannels.
 *
 * Prerequisites:
 * 1. Add a TXT record to your domain for MailChannels verification:
 *    _mailchannels.aihcolamail.xyz => "aihcolamail.xyz"
 *
 * 2. Set the SEND_KEY environment variable for additional security.
 */

interface SendParams {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  subject: string;
  text: string;
  html?: string;
}

export async function sendViaMailChannels(
  params: SendParams,
  sendKey?: string
): Promise<{ success: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    personalizations: [
      {
        to: params.to,
        ...(params.cc?.length && { cc: params.cc }),
        ...(params.bcc?.length && { bcc: params.bcc }),
      },
    ],
    from: params.from,
    subject: params.subject,
    content: [],
  };

  const contents = payload.content as { type: string; value: string }[];
  if (params.html) {
    contents.push({ type: 'text/html', value: params.html });
  }
  contents.push({ type: 'text/plain', value: params.text });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sendKey) {
    headers['X-Send-Key'] = sendKey;
  }

  try {
    const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      return { success: true };
    }

    const errorText = await resp.text();
    console.error('MailChannels error:', resp.status, errorText);
    return { success: false, error: `Send failed: ${resp.status} ${errorText}` };
  } catch (err) {
    console.error('MailChannels request error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}
