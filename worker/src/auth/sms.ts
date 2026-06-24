/**
 * SMS verification code sending.
 * Production: Twilio Verify API.
 * Development: Codes logged to console (no Twilio credentials needed).
 */
import type { Env } from '../types';

/**
 * Send a verification code to a phone number.
 * In dev mode (no Twilio creds), logs the code to console.
 */
export async function sendVerificationCode(
  env: Env,
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  // Dev mode: log code to console, always succeed
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
    console.log('══════════════════════════════════════');
    console.log(`  DEV SMS → ${phone}`);
    console.log(`  Code: ${code}`);
    console.log('══════════════════════════════════════');
    return { success: true };
  }

  // Production: Twilio Messages API
  try {
    const body = `Your Mail verification code: ${code}`;
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
        },
        body: new URLSearchParams({
          To: phone,
          From: env.TWILIO_PHONE_NUMBER,
          Body: body,
        }).toString(),
      }
    );

    if (!resp.ok) {
      const errData = await resp.json() as { message?: string };
      return { success: false, error: errData?.message || 'SMS send failed' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'SMS error' };
  }
}

/**
 * Generate a random 6-digit code.
 */
export function generateCode(): string {
  const num = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Validate phone number format (E.164: +[country][number]).
 * Accepts formats like: +8613800138000, +12345678901
 */
export function validatePhoneNumber(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
