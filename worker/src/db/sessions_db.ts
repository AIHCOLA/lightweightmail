import type { Session } from '../types';
import { generateUUID } from '../utils/id';

/**
 * Create a new session.
 */
export async function createSession(
  db: D1Database,
  userAgent: string | null,
  ipHash: string | null
): Promise<Session> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO sessions (id, created_at, last_active_at, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, now, now, userAgent ?? null, ipHash ?? null)
    .run();

  return { id, created_at: now, last_active_at: now };
}

/**
 * Get a session by ID.
 */
export async function getSession(
  db: D1Database,
  id: string
): Promise<Session | null> {
  const row = await db
    .prepare(`SELECT id, created_at, last_active_at FROM sessions WHERE id = ?`)
    .bind(id)
    .first<Session>();

  return row ?? null;
}

/**
 * Update session last_active_at timestamp.
 */
export async function touchSession(
  db: D1Database,
  id: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(`UPDATE sessions SET last_active_at = ? WHERE id = ?`)
    .bind(now, id)
    .run();
}
