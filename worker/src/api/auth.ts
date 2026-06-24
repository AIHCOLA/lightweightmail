/**
 * Auth API router — login, OAuth, token management.
 */
import { AutoRouter } from 'itty-router';
import type { Env } from '../types';
import { json, error } from '../utils/response';
import { signAccessToken, signRefreshToken, hashToken } from '../auth/jwt';
import { getAuth } from '../auth/middleware';
import { generateCsrfToken, setCsrfCookie, validateCsrf } from '../auth/csrf';
import { sendVerificationCode, generateCode, validatePhoneNumber } from '../auth/sms';
import {
  getGitHubAuthUrl, exchangeGitHubCode, getGitHubUser,
  getGoogleAuthUrl, exchangeGoogleCode, getGoogleUser,
} from '../auth/oauth';
import * as usersDb from '../db/users_db';
import { checkRateLimit } from '../utils/rate_limit';

export const authRouter = AutoRouter();

// ─── CSRF Token ───────────────────────────────────

authRouter.get('/api/auth/csrf', async (_req, env: Env) => {
  const token = generateCsrfToken();
  const resp = json({ success: true, data: { csrf_token: token } });
  return setCsrfCookie(resp, token);
});

// ─── Send SMS Code ────────────────────────────────

authRouter.post('/api/auth/send-code', async (req, env: Env) => {
  const clientIP = req.headers.get('cf-connecting-ip') ?? 'unknown';

  // Rate limit: 1 per 60s per IP
  if (!checkRateLimit(`send-code:${clientIP}`, 3, 60)) {
    return error('Too many requests. Please wait before requesting another code.', 429);
  }

  let body: { phone?: string; csrf_token?: string };
  try { body = await req.json(); } catch { return error('Invalid JSON', 400); }

  const { phone, csrf_token } = body;
  if (!phone || !validatePhoneNumber(phone)) {
    return error('Invalid phone number. Use format: +8613800138000', 400);
  }

  // CSRF check
  if (csrf_token && !validateCsrf(req, csrf_token)) {
    return error('Invalid CSRF token', 403);
  }

  // Rate limit per phone: max 5 per hour
  const recentCount = await usersDb.countRecentCodes(env.DB, phone, 3600);
  if (recentCount >= 5) {
    return error('Too many code requests for this phone number. Try again later.', 429);
  }

  // Generate and store code
  const code = generateCode();
  await usersDb.storeVerificationCode(env.DB, phone, code, 'login', 300);

  // Send via SMS (dev mode returns code directly in response)
  if (!env.JWT_SECRET) {
    return error('Auth not configured', 500);
  }

  const result = await sendVerificationCode(env, phone, code);
  if (!result.success) {
    return error(result.error ?? 'Failed to send verification code', 500);
  }

  // In dev mode (no Twilio), return the code directly so it's easy to find
  const isDev = !env.TWILIO_ACCOUNT_SID;
  return json({
    success: true,
    data: {
      message: 'Verification code sent',
      ...(isDev ? { code, hint: 'Dev mode — use this code to login' } : {}),
    },
  });
});

// ─── Verify Code & Login ──────────────────────────

authRouter.post('/api/auth/verify-code', async (req, env: Env) => {
  const clientIP = req.headers.get('cf-connecting-ip') ?? 'unknown';

  if (!checkRateLimit(`verify-code:${clientIP}`, 5, 600)) {
    return error('Too many attempts. Please try again later.', 429);
  }

  let body: { phone?: string; code?: string };
  try { body = await req.json(); } catch { return error('Invalid JSON', 400); }

  const { phone, code } = body;
  if (!phone || !code) {
    return error('Phone and code are required', 400);
  }

  if (!env.JWT_SECRET) {
    return error('Auth not configured', 500);
  }

  // Verify code
  const valid = await usersDb.checkAndConsumeCode(env.DB, phone, code, 'login');
  if (!valid) {
    return error('Invalid or expired code', 401);
  }

  // Find or create user
  let user = await usersDb.getUserByPhone(env.DB, phone);
  if (!user) {
    user = await usersDb.createUserByPhone(env.DB, phone);
  } else {
    await usersDb.updateLastLogin(env.DB, user.id);
  }

  // Generate tokens
  const accessToken = await signAccessToken(env.JWT_SECRET, user.id, user.phone_verified);
  const refreshToken = await signRefreshToken(env.JWT_SECRET, user.id);
  const tokenHash = await hashToken(refreshToken);

  // Store refresh token
  await usersDb.createRefreshToken(env.DB, user.id, tokenHash, tokenHash.substring(0, 16));

  return json({
    success: true,
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        phone_verified: !!user.phone_verified,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
});

// ─── Refresh Token ────────────────────────────────

authRouter.post('/api/auth/refresh', async (req, env: Env) => {
  let body: { refresh_token?: string };
  try { body = await req.json(); } catch { return error('Invalid JSON', 400); }

  const { refresh_token } = body;
  if (!refresh_token || !env.JWT_SECRET) {
    return error('Refresh token is required', 400);
  }

  const tokenHash = await hashToken(refresh_token);

  // Verify and consume existing token (family rotation)
  const verified = await usersDb.verifyRefreshToken(env.DB, tokenHash);
  if (!verified) {
    return error('Invalid or revoked refresh token', 401);
  }

  const user = await usersDb.getUserById(env.DB, verified.user_id);
  if (!user) {
    return error('User not found', 404);
  }

  // Generate new pair
  const newAccessToken = await signAccessToken(env.JWT_SECRET, user.id, user.phone_verified);
  const newRefreshToken = await signRefreshToken(env.JWT_SECRET, user.id);
  const newTokenHash = await hashToken(newRefreshToken);

  // Store new refresh token (same family)
  await usersDb.createRefreshToken(env.DB, user.id, newTokenHash, verified.family);

  return json({
    success: true,
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    },
  });
});

// ─── Logout ───────────────────────────────────────

authRouter.post('/api/auth/logout', async (req, env: Env) => {
  let body: { refresh_token?: string };
  try { body = await req.json(); } catch { return error('Invalid JSON', 400); }

  if (body.refresh_token) {
    const tokenHash = await hashToken(body.refresh_token);
    await usersDb.revokeRefreshToken(env.DB, tokenHash);
  }

  return json({ success: true, data: { message: 'Logged out' } });
});

// ─── Get Current User ─────────────────────────────

authRouter.get('/api/auth/me', async (req, env: Env) => {
  const auth = getAuth(req as Request);
  if (!auth) {
    return error('Authentication required', 401);
  }

  const user = await usersDb.getUserById(env.DB, auth.user_id);
  if (!user) {
    return error('User not found', 404);
  }

  const accounts = await usersDb.getAccounts(env.DB, user.id);

  return json({
    success: true,
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        phone_verified: !!user.phone_verified,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
      accounts: accounts.map(a => ({
        provider: a.provider,
        provider_email: a.provider_email,
        provider_name: a.provider_name,
        linked_at: a.linked_at,
      })),
    },
  });
});

// ─── GitHub OAuth Redirect ────────────────────────

authRouter.get('/api/auth/oauth/github', async (req, env: Env) => {
  if (!env.GITHUB_CLIENT_ID) {
    return error('GitHub OAuth not configured', 501);
  }

  const state = generateCsrfToken();
  const url = getGitHubAuthUrl(env, state);

  // Set state in a cookie for CSRF verification on callback
  const resp = json({ success: true, data: { url } });
  resp.headers.append(
    'Set-Cookie',
    `oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`
  );
  return resp;
});

// ─── GitHub OAuth Callback ────────────────────────

authRouter.get('/api/auth/oauth/github/callback', async (req, env: Env) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  // Validate state from cookie
  const cookie = req.headers.get('Cookie') || '';
  const stateMatch = cookie.match(/oauth_state=([^;]+)/);
  if (!returnedState || !stateMatch || returnedState !== stateMatch[1]) {
    return new Response('Invalid state parameter. Please try logging in again.', { status: 403 });
  }

  if (!code) {
    return new Response('Missing authorization code.', { status: 400 });
  }

  if (!env.JWT_SECRET) {
    return new Response('Auth not configured.', { status: 500 });
  }

  // Exchange code for token
  const tokenResult = await exchangeGitHubCode(env, code);
  if (!tokenResult) {
    return new Response('Failed to exchange GitHub code.', { status: 500 });
  }

  // Get GitHub user
  const ghUser = await getGitHubUser(tokenResult.access_token);
  if (!ghUser) {
    return new Response('Failed to get GitHub user info.', { status: 500 });
  }

  const providerUserId = String(ghUser.id);

  // Find or create user
  let user = await usersDb.getUserByAccount(env.DB, 'github', providerUserId);
  if (!user) {
    user = await usersDb.createUserByOAuth(
      env.DB, 'github', providerUserId,
      ghUser.email, ghUser.name || ghUser.login, ghUser.avatar_url
    );
  } else {
    await usersDb.updateLastLogin(env.DB, user.id);
  }

  // Generate tokens
  const accessToken = await signAccessToken(env.JWT_SECRET, user.id, user.phone_verified);
  const refreshToken = await signRefreshToken(env.JWT_SECRET, user.id);
  const tokenHash = await hashToken(refreshToken);
  await usersDb.createRefreshToken(env.DB, user.id, tokenHash, tokenHash.substring(0, 16));

  // Redirect to frontend with tokens in URL fragment
  const redirectUrl = env.DOMAIN
    ? `https://${env.DOMAIN}/oauth/callback`
    : 'http://localhost:3000/oauth/callback';

  const params = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: user.id,
    display_name: user.display_name || '',
  });

  return Response.redirect(`${redirectUrl}?${params}`, 302);
});

// ─── Google OAuth Redirect ────────────────────────

authRouter.get('/api/auth/oauth/google', async (req, env: Env) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return error('Google OAuth not configured', 501);
  }

  const state = generateCsrfToken();
  const url = getGoogleAuthUrl(env, state);

  const resp = json({ success: true, data: { url } });
  resp.headers.append(
    'Set-Cookie',
    `oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`
  );
  return resp;
});

// ─── Google OAuth Callback ────────────────────────

authRouter.get('/api/auth/oauth/google/callback', async (req, env: Env) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  // Validate state from cookie
  const cookie = req.headers.get('Cookie') || '';
  const stateMatch = cookie.match(/oauth_state=([^;]+)/);
  if (!returnedState || !stateMatch || returnedState !== stateMatch[1]) {
    return new Response('Invalid state parameter. Please try logging in again.', { status: 403 });
  }

  if (!code) {
    return new Response('Missing authorization code.', { status: 400 });
  }

  if (!env.JWT_SECRET) {
    return new Response('Auth not configured.', { status: 500 });
  }

  // Exchange code for token
  const tokenResult = await exchangeGoogleCode(env, code);
  if (!tokenResult) {
    return new Response('Failed to exchange Google code.', { status: 500 });
  }

  // Get Google user
  const googleUser = await getGoogleUser(tokenResult.access_token);
  if (!googleUser) {
    return new Response('Failed to get Google user info.', { status: 500 });
  }

  // Find or create user
  let user = await usersDb.getUserByAccount(env.DB, 'google', googleUser.sub);
  if (!user) {
    user = await usersDb.createUserByOAuth(
      env.DB, 'google', googleUser.sub,
      googleUser.email, googleUser.name, googleUser.picture
    );
  } else {
    await usersDb.updateLastLogin(env.DB, user.id);
  }

  // Generate tokens
  const accessToken = await signAccessToken(env.JWT_SECRET, user.id, user.phone_verified);
  const refreshToken = await signRefreshToken(env.JWT_SECRET, user.id);
  const tokenHash = await hashToken(refreshToken);
  await usersDb.createRefreshToken(env.DB, user.id, tokenHash, tokenHash.substring(0, 16));

  // Redirect to frontend
  const redirectUrl = env.DOMAIN
    ? `https://${env.DOMAIN}/oauth/callback`
    : 'http://localhost:3000/oauth/callback';

  const params = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: user.id,
    display_name: user.display_name || '',
  });

  return Response.redirect(`${redirectUrl}?${params}`, 302);
});
