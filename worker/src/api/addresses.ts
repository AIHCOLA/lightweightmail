import { AutoRouter } from 'itty-router';
import type { Env } from '../types';
import { json, error } from '../utils/response';
import { checkRateLimit } from '../utils/rate_limit';
import { generateLocalPart, validatePrefix } from '../utils/id';
import { optionalAuth } from '../auth/middleware';
import * as addressesDb from '../db/addresses_db';
import * as sessionsDb from '../db/sessions_db';
import * as emailsDb from '../db/emails_db';

export const addressesRouter = AutoRouter();

/**
 * Helper: verify address ownership.
 * Checks JWT user_id first, then falls back to session_id.
 */
async function verifyOwnership(
  db: D1Database,
  addressId: string,
  authUserId: string | null,
  sessionId: string | null
): Promise<boolean> {
  const address = await addressesDb.getAddressById(db, addressId);
  if (!address) return false;
  // JWT auth: check user_id
  if (authUserId && address.user_id === authUserId) return true;
  // Session auth: check session_id
  if (sessionId && address.session_id === sessionId) return true;
  return false;
}

/**
 * POST /api/addresses — Generate a new temporary email address.
 */
addressesRouter.post('/api/addresses', optionalAuth as any, async (req, env: Env) => {
  const clientIP = req.headers.get('cf-connecting-ip') ?? 'unknown';

  if (!checkRateLimit(`address:${clientIP}`, 10, 60)) {
    return error('Too many requests. Please try again later.', 429);
  }

  let body: { session_id?: string; prefix?: string };
  try { body = await req.json(); } catch { return error('Invalid JSON body', 400); }

  const { session_id, prefix } = body;

  // Get auth context (may be null if not authenticated)
  const reqAuth = (req as any).auth as { user_id: string } | undefined;
  const authUserId = reqAuth?.user_id ?? null;

  if (!authUserId && !session_id) {
    return error('session_id is required for guest users', 400);
  }

  // If authenticated, verify session_id only for guest mode
  if (!authUserId) {
    const session = await sessionsDb.getSession(env.DB, session_id!);
    if (!session) {
      return error('Session not found', 404);
    }
  }

  // Check max addresses
  const maxAddresses = parseInt(
    (await emailsDb.getConfig(env.DB, 'max_addresses_per_session')) ?? '5'
  );
  const currentCount = authUserId
    ? await addressesDb.countActiveByUser(env.DB, authUserId)
    : await addressesDb.countActiveBySession(env.DB, session_id!);
  if (currentCount >= maxAddresses) {
    return error(
      `Maximum ${maxAddresses} active addresses reached`,
      400
    );
  }

  // Generate local part
  let localPart: string;
  if (prefix) {
    if (!validatePrefix(prefix)) {
      return error(
        'Invalid address. Use 3-30 characters: letters, numbers, dots, underscores, dashes.',
        400
      );
    }
    localPart = prefix.toLowerCase();
  } else {
    localPart = generateLocalPart();
  }

  const domain = env.DOMAIN || 'temp.example.com';
  const fullAddress = `${localPart}@${domain}`;

  // Check uniqueness
  const existing = await addressesDb.getAddressByFullAddress(env.DB, fullAddress);
  if (existing) {
    if (prefix) {
      return error(`Address ${fullAddress} is already taken. Try a different one.`, 409);
    }
    localPart = generateLocalPart();
  }

  const finalAddress = `${localPart}@${domain}`;
  const ttlHours = parseInt(env.DEFAULT_ADDRESS_TTL_HOURS ?? '24');

  const address = await addressesDb.createAddress(
    env.DB,
    session_id || 'guest',
    localPart,
    finalAddress,
    ttlHours,
    authUserId
  );

  return json({ success: true, data: address }, 201);
});

/**
 * GET /api/addresses — List all active addresses.
 * Supports user_id (JWT) and session_id (guest) query params.
 */
addressesRouter.get('/api/addresses', optionalAuth as any, async (req, env: Env) => {
  const reqAuth = (req as any).auth as { user_id: string } | undefined;
  const authUserId = reqAuth?.user_id ?? null;

  const sessionId = req.query.session_id as string | undefined;

  let addresses;
  if (authUserId) {
    addresses = await addressesDb.getAddressesByUser(env.DB, authUserId);
  } else if (sessionId) {
    addresses = await addressesDb.getAddressesBySession(env.DB, sessionId);
  } else {
    return error('Provide session_id query parameter or authenticate', 400);
  }

  return json({ success: true, data: addresses });
});

/**
 * DELETE /api/addresses/:id — Deactivate an address.
 */
addressesRouter.delete('/api/addresses/:id', optionalAuth as any, async (req, env: Env) => {
  const addressId = req.params.id;

  let body: { session_id?: string };
  try { body = await req.json(); } catch { return error('Invalid JSON body', 400); }

  const reqAuth = (req as any).auth as { user_id: string } | undefined;
  const authUserId = reqAuth?.user_id ?? null;
  const sessionId = body.session_id ?? null;

  // Verify ownership
  const owns = await verifyOwnership(env.DB, addressId, authUserId, sessionId);
  if (!owns) {
    return error('Unauthorized: address does not belong to this session/user', 403);
  }

  await addressesDb.deactivateAddress(env.DB, addressId);
  return json({ success: true, message: 'Address deactivated' });
});
