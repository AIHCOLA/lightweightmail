/**
 * OAuth integration for GitHub and Google.
 */
import type { Env } from '../types';

// ─── GitHub ───────────────────────────────────────

export function getGitHubAuthUrl(env: Env, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID || '',
    redirect_uri: env.DOMAIN
      ? `https://${env.DOMAIN}/api/auth/oauth/github/callback`
      : 'http://localhost:8787/api/auth/oauth/github/callback',
    scope: 'user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGitHubCode(
  env: Env,
  code: string
): Promise<{ access_token: string } | null> {
  try {
    const redirectUri = env.DOMAIN
      ? `https://${env.DOMAIN}/api/auth/oauth/github/callback`
      : 'http://localhost:8787/api/auth/oauth/github/callback';

    const resp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await resp.json() as { access_token?: string; error?: string };
    if (data.error || !data.access_token) return null;
    return { access_token: data.access_token };
  } catch {
    return null;
  }
}

export async function getGitHubUser(
  accessToken: string
): Promise<{ id: number; login: string; email: string | null; name: string | null; avatar_url: string } | null> {
  try {
    const resp = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'temp-mail',
      },
    });
    if (!resp.ok) return null;

    const user = await resp.json() as {
      id: number; login: string; email: string | null;
      name: string | null; avatar_url: string;
    };

    // If email is private, fetch emails separately
    if (!user.email) {
      const emailResp = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'temp-mail',
        },
      });
      if (emailResp.ok) {
        const emails = await emailResp.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primary = emails.find(e => e.primary && e.verified);
        if (primary) user.email = primary.email;
      }
    }

    return user;
  } catch {
    return null;
  }
}

// ─── Google ───────────────────────────────────────

export function getGoogleAuthUrl(env: Env, state: string): string {
  const redirectUri = env.DOMAIN
    ? `https://${env.DOMAIN}/api/auth/oauth/google/callback`
    : 'http://localhost:8787/api/auth/oauth/google/callback';

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
  env: Env,
  code: string
): Promise<{ access_token: string; id_token: string } | null> {
  try {
    const redirectUri = env.DOMAIN
      ? `https://${env.DOMAIN}/api/auth/oauth/google/callback`
      : 'http://localhost:8787/api/auth/oauth/google/callback';

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    const data = await resp.json() as {
      access_token?: string; id_token?: string; error?: string;
    };
    if (data.error || !data.access_token) return null;
    return {
      access_token: data.access_token,
      id_token: data.id_token || '',
    };
  } catch {
    return null;
  }
}

export async function getGoogleUser(
  accessToken: string
): Promise<{ sub: string; email: string; name: string; picture: string } | null> {
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { sub: string; email: string; name: string; picture: string };
    return data;
  } catch {
    return null;
  }
}
