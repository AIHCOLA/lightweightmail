/**
 * Database operations for users, accounts, verification codes, and refresh tokens.
 */
import { generateUUID } from '../utils/id';
import type { User, Account } from '../types';

// ─── Users ────────────────────────────────────────

export async function createUserByPhone(
  db: D1Database,
  phone: string
): Promise<User> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO users (id, phone, phone_verified, display_name, avatar_url, created_at, last_login_at)
       VALUES (?, ?, 1, NULL, NULL, ?, ?)`
    )
    .bind(id, phone, now, now)
    .run();

  return {
    id, phone, phone_verified: 1,
    display_name: null, avatar_url: null,
    created_at: now, last_login_at: now,
  };
}

export async function createUserByOAuth(
  db: D1Database,
  provider: string,
  providerUserId: string,
  email: string | null,
  name: string | null,
  avatar: string | null
): Promise<User> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO users (id, phone, phone_verified, display_name, avatar_url, created_at, last_login_at)
       VALUES (?, NULL, 0, ?, ?, ?, ?)`
    )
    .bind(id, name, avatar, now, now)
    .run();

  // Link OAuth account
  await db
    .prepare(
      `INSERT INTO accounts (id, user_id, provider, provider_user_id, provider_email, provider_name, provider_avatar, linked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(generateUUID(), id, provider, providerUserId, email, name, avatar, now)
    .run();

  return {
    id, phone: null, phone_verified: 0,
    display_name: name, avatar_url: avatar,
    created_at: now, last_login_at: now,
  };
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<User>() ?? null;
}

export async function getUserByPhone(db: D1Database, phone: string): Promise<User | null> {
  return db.prepare(`SELECT * FROM users WHERE phone = ?`).bind(phone).first<User>() ?? null;
}

export async function getUserByAccount(
  db: D1Database,
  provider: string,
  providerUserId: string
): Promise<User | null> {
  return db
    .prepare(
      `SELECT u.* FROM users u
       JOIN accounts a ON u.id = a.user_id
       WHERE a.provider = ? AND a.provider_user_id = ?`
    )
    .bind(provider, providerUserId)
    .first<User>() ?? null;
}

export async function updateLastLogin(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`)
    .bind(Math.floor(Date.now() / 1000), userId)
    .run();
}

export async function updateUserPhone(
  db: D1Database,
  userId: string,
  phone: string
): Promise<void> {
  await db
    .prepare(`UPDATE users SET phone = ?, phone_verified = 1 WHERE id = ?`)
    .bind(phone, userId)
    .run();
}

// ─── Accounts ─────────────────────────────────────

export async function getAccounts(db: D1Database, userId: string): Promise<Account[]> {
  const result = await db
    .prepare(`SELECT * FROM accounts WHERE user_id = ? ORDER BY linked_at DESC`)
    .bind(userId)
    .all<Account>();
  return result.results;
}

export async function linkAccount(
  db: D1Database,
  userId: string,
  provider: string,
  providerUserId: string,
  email: string | null,
  name: string | null,
  avatar: string | null
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT OR IGNORE INTO accounts (id, user_id, provider, provider_user_id, provider_email, provider_name, provider_avatar, linked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(generateUUID(), userId, provider, providerUserId, email, name, avatar, now)
    .run();
}

export async function unlinkAccount(
  db: D1Database,
  userId: string,
  provider: string
): Promise<void> {
  await db
    .prepare(`DELETE FROM accounts WHERE user_id = ? AND provider = ?`)
    .bind(userId, provider)
    .run();
}

// ─── Verification Codes ──────────────────────────

export async function storeVerificationCode(
  db: D1Database,
  phone: string,
  code: string,
  purpose: string,
  ttlSeconds: number = 300
): Promise<void> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;

  await db
    .prepare(
      `INSERT INTO verification_codes (id, phone, code, purpose, expires_at, used, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`
    )
    .bind(id, phone, code, purpose, expiresAt, now)
    .run();
}

export async function checkAndConsumeCode(
  db: D1Database,
  phone: string,
  code: string,
  purpose: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  // Find valid code
  const record = await db
    .prepare(
      `SELECT * FROM verification_codes
       WHERE phone = ? AND purpose = ? AND used = 0 AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(phone, purpose, now)
    .first<{ id: string; code: string; attempts: number }>();

  if (!record) return false;

  // Increment attempts
  await db
    .prepare(`UPDATE verification_codes SET attempts = ? WHERE id = ?`)
    .bind(record.attempts + 1, record.id)
    .run();

  // Max 3 attempts
  if (record.attempts >= 3) {
    await db
      .prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`)
      .bind(record.id)
      .run();
    return false;
  }

  // Check code match
  if (record.code !== code) return false;

  // Consume
  await db
    .prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`)
    .bind(record.id)
    .run();

  return true;
}

export async function countRecentCodes(
  db: D1Database,
  phone: string,
  windowSeconds: number = 3600
): Promise<number> {
  const since = Math.floor(Date.now() / 1000) - windowSeconds;
  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM verification_codes
       WHERE phone = ? AND created_at > ?`
    )
    .bind(phone, since)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

// ─── Refresh Tokens ───────────────────────────────

export async function createRefreshToken(
  db: D1Database,
  userId: string,
  tokenHash: string,
  family: string,
  ttlSeconds: number = 2592000
): Promise<void> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;

  await db
    .prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, family, expires_at, created_at, revoked)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(id, userId, tokenHash, family, expiresAt, now)
    .run();
}

export async function revokeRefreshToken(
  db: D1Database,
  tokenHash: string
): Promise<void> {
  await db
    .prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?`)
    .bind(tokenHash)
    .run();
}

export async function revokeRefreshTokenFamily(
  db: D1Database,
  family: string
): Promise<void> {
  await db
    .prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE family = ?`)
    .bind(family)
    .run();
}

/**
 * Verify a refresh token hash and return the associated family + user_id.
 * If the token is already revoked, revoke the entire family (theft detection).
 */
export async function verifyRefreshToken(
  db: D1Database,
  tokenHash: string
): Promise<{ user_id: string; family: string } | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, family, revoked, expires_at FROM refresh_tokens
       WHERE token_hash = ?`
    )
    .bind(tokenHash)
    .first<{ id: string; user_id: string; family: string; revoked: number; expires_at: number }>();

  if (!row) return null;

  const now = Math.floor(Date.now() / 1000);

  // If token is already revoked → theft detected, revoke entire family
  if (row.revoked === 1) {
    await revokeRefreshTokenFamily(db, row.family);
    return null;
  }

  // If token is expired
  if (row.expires_at < now) {
    return null;
  }

  // Revoke this specific token (rotation)
  await revokeRefreshToken(db, tokenHash);

  return { user_id: row.user_id, family: row.family };
}

export async function getUserRefreshTokens(
  db: D1Database,
  userId: string
): Promise<Array<{ id: string; created_at: number }>> {
  const result = await db
    .prepare(
      `SELECT id, created_at FROM refresh_tokens
       WHERE user_id = ? AND revoked = 0 AND expires_at > ?
       ORDER BY created_at DESC`
    )
    .bind(userId, Math.floor(Date.now() / 1000))
    .all<{ id: string; created_at: number }>();
  return result.results;
}
