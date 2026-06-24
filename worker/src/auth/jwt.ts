/**
 * JWT signing and verification using @tsndr/cloudflare-worker-jwt.
 * Note: This library puts exp/nbf directly in the payload, not in options.
 */
import jwt from '@tsndr/cloudflare-worker-jwt';
import type { JwtPayload } from '../types';

export async function signAccessToken(
  secret: string,
  userId: string,
  phoneVerified: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: userId,
      iat: now,
      exp: now + 900, // 15 minutes
      type: 'access',
      phone_verified: phoneVerified,
    },
    secret,
    { algorithm: 'HS256' }
  );
}

export async function signRefreshToken(
  secret: string,
  userId: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: userId,
      iat: now,
      exp: now + 2592000, // 30 days
      type: 'refresh',
      phone_verified: 0,
    },
    secret,
    { algorithm: 'HS256' }
  );
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const data = await jwt.verify<{ type?: string; phone_verified?: number }>(token, secret, { algorithm: 'HS256' });
    if (!data || data.payload.type !== 'access') return null;
    const p = data.payload;
    return {
      sub: p.sub ?? '',
      iat: p.iat ?? 0,
      exp: p.exp ?? 0,
      type: 'access' as const,
      phone_verified: p.phone_verified ?? 0,
    };
  } catch {
    return null;
  }
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
