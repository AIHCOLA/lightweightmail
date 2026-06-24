import type { EmailAddress } from '../types';
import { generateUUID } from '../utils/id';

/**
 * Create a new email address.
 */
export async function createAddress(
  db: D1Database,
  sessionId: string,
  localPart: string,
  fullAddress: string,
  ttlHours: number,
  userId?: string | null
): Promise<EmailAddress> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlHours * 3600;

  await db
    .prepare(
      `INSERT INTO email_addresses (id, session_id, user_id, local_part, full_address, created_at, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(id, sessionId, userId ?? null, localPart, fullAddress, now, expiresAt)
    .run();

  return {
    id, session_id: sessionId, user_id: userId ?? null,
    local_part: localPart, full_address: fullAddress,
    created_at: now, expires_at: expiresAt, is_active: 1, unread_count: 0,
  };
}

/**
 * Get all active addresses for a session, with unread email counts.
 */
export async function getAddressesBySession(
  db: D1Database,
  sessionId: string
): Promise<EmailAddress[]> {
  const result = await db
    .prepare(
      `SELECT a.*, COALESCE(
        (SELECT COUNT(*) FROM emails e WHERE e.address_id = a.id AND e.is_read = 0 AND e.folder = 'inbox'), 0
      ) as unread_count
      FROM email_addresses a
      WHERE a.session_id = ? AND a.is_active = 1
      ORDER BY a.created_at DESC`
    )
    .bind(sessionId)
    .all<EmailAddress>();

  return result.results;
}

/**
 * Get all active addresses for a user (authenticated).
 */
export async function getAddressesByUser(
  db: D1Database,
  userId: string
): Promise<EmailAddress[]> {
  const result = await db
    .prepare(
      `SELECT a.*, COALESCE(
        (SELECT COUNT(*) FROM emails e WHERE e.address_id = a.id AND e.is_read = 0 AND e.folder = 'inbox'), 0
      ) as unread_count
      FROM email_addresses a
      WHERE a.user_id = ? AND a.is_active = 1
      ORDER BY a.created_at DESC`
    )
    .bind(userId)
    .all<EmailAddress>();

  return result.results;
}

/**
 * Look up an address by its full email address (used by email handler).
 */
export async function getAddressByFullAddress(
  db: D1Database,
  fullAddress: string
): Promise<EmailAddress | null> {
  const row = await db
    .prepare(`SELECT * FROM email_addresses WHERE full_address = ? AND is_active = 1`)
    .bind(fullAddress)
    .first<EmailAddress>();
  return row ?? null;
}

/**
 * Get a single address by ID.
 */
export async function getAddressById(
  db: D1Database,
  addressId: string
): Promise<EmailAddress | null> {
  const row = await db
    .prepare(`SELECT * FROM email_addresses WHERE id = ?`)
    .bind(addressId)
    .first<EmailAddress>();
  return row ?? null;
}

/**
 * Deactivate an address (soft delete).
 */
export async function deactivateAddress(
  db: D1Database,
  addressId: string
): Promise<void> {
  await db
    .prepare(`UPDATE email_addresses SET is_active = 0 WHERE id = ?`)
    .bind(addressId)
    .run();
}

/**
 * Count active addresses for a session (guest).
 */
export async function countActiveBySession(
  db: D1Database,
  sessionId: string
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as count FROM email_addresses WHERE session_id = ? AND is_active = 1`)
    .bind(sessionId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/**
 * Count active addresses for a user (authenticated).
 */
export async function countActiveByUser(
  db: D1Database,
  userId: string
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as count FROM email_addresses WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/**
 * Check if an address exists and is not expired.
 */
export async function isAddressUnexpired(
  db: D1Database,
  fullAddress: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT 1 FROM email_addresses
       WHERE full_address = ? AND is_active = 1 AND expires_at > ?`
    )
    .bind(fullAddress, now)
    .first();
  return row !== null;
}
