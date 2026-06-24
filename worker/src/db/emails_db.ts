import type { Email, EmailListItem, Attachment } from '../types';
import { generateUUID } from '../utils/id';

/**
 * Insert a received email into inbox.
 */
export async function insertEmail(
  db: D1Database,
  params: {
    addressId: string;
    fromAddress: string;
    fromName: string | null;
    toAddress: string;
    subject: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
    ttlMinutes: number;
    rawSize: number;
    hasAttachments: number;
  }
): Promise<Email> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + params.ttlMinutes * 60;

  const bodyTextTrunc = params.bodyText?.substring(0, 65536) ?? null;
  const bodyHtmlTrunc = params.bodyHtml?.substring(0, 262144) ?? null;

  await db
    .prepare(
      `INSERT INTO emails
       (id, address_id, from_address, from_name, to_address, subject,
        body_text, body_html, is_read, folder, received_at, expires_at,
        size_bytes, has_attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'inbox', ?, ?, ?, ?)`
    )
    .bind(
      id, params.addressId, params.fromAddress, params.fromName,
      params.toAddress, params.subject, bodyTextTrunc, bodyHtmlTrunc,
      now, expiresAt, params.rawSize, params.hasAttachments
    )
    .run();

  return {
    id, address_id: params.addressId, from_address: params.fromAddress,
    from_name: params.fromName, to_address: params.toAddress,
    cc: null, bcc: null, subject: params.subject,
    body_text: bodyTextTrunc, body_html: bodyHtmlTrunc,
    is_read: 0, folder: 'inbox', in_reply_to: null, is_starred: 0,
    received_at: now, expires_at: expiresAt,
    size_bytes: params.rawSize, has_attachments: params.hasAttachments,
  };
}

/**
 * Save a sent email or draft.
 */
export async function saveSentEmail(
  db: D1Database,
  params: {
    addressId: string;
    fromAddress: string;
    fromName?: string;
    toAddress: string;
    cc?: string | null;
    bcc?: string | null;
    subject: string;
    bodyText: string;
    bodyHtml?: string | null;
    folder: 'sent' | 'drafts';
    inReplyTo?: string | null;
    isStarred?: number;
  }
): Promise<Email> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const ttlMinutes = parseInt(
    (await getConfig(db, 'email_ttl_minutes')) ?? '10'
  );
  const expiresAt = now + ttlMinutes * 60;

  const bodyTextTrunc = params.bodyText.substring(0, 65536);
  const bodyHtmlTrunc = params.bodyHtml?.substring(0, 262144) ?? null;

  await db
    .prepare(
      `INSERT INTO emails
       (id, address_id, from_address, from_name, to_address, cc, bcc,
        subject, body_text, body_html, is_read, folder, in_reply_to,
        is_starred, received_at, expires_at, size_bytes, has_attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(
      id, params.addressId, params.fromAddress, params.fromName ?? null,
      params.toAddress, params.cc ?? null, params.bcc ?? null,
      params.subject, bodyTextTrunc, bodyHtmlTrunc,
      params.folder, params.inReplyTo ?? null, params.isStarred ?? 0,
      now, expiresAt, bodyTextTrunc.length + (bodyHtmlTrunc?.length ?? 0)
    )
    .run();

  return {
    id, address_id: params.addressId, from_address: params.fromAddress,
    from_name: params.fromName ?? null, to_address: params.toAddress,
    cc: params.cc ?? null, bcc: params.bcc ?? null, subject: params.subject,
    body_text: bodyTextTrunc, body_html: bodyHtmlTrunc,
    is_read: 1, folder: params.folder, in_reply_to: params.inReplyTo ?? null,
    is_starred: params.isStarred ?? 0,
    received_at: now, expires_at: expiresAt,
    size_bytes: bodyTextTrunc.length, has_attachments: 0,
  };
}

/**
 * Get emails for an address by folder with optional delta-polling.
 */
export async function getEmailsByFolder(
  db: D1Database,
  addressId: string,
  folder: string = 'inbox',
  sinceTimestamp?: number,
  limit: number = 50
): Promise<EmailListItem[]> {
  let query: string;
  let bindings: unknown[];

  if (sinceTimestamp && folder === 'inbox') {
    query = `SELECT
      id, address_id, from_address, from_name, to_address, cc,
      subject, substr(body_text, 1, 200) as body_text_preview,
      is_read, folder, in_reply_to, is_starred,
      received_at, expires_at, size_bytes, has_attachments
      FROM emails
      WHERE address_id = ? AND folder = ? AND received_at > ?
      ORDER BY received_at DESC LIMIT ?`;
    bindings = [addressId, folder, sinceTimestamp, limit];
  } else {
    query = `SELECT
      id, address_id, from_address, from_name, to_address, cc,
      subject, substr(body_text, 1, 200) as body_text_preview,
      is_read, folder, in_reply_to, is_starred,
      received_at, expires_at, size_bytes, has_attachments
      FROM emails
      WHERE address_id = ? AND folder = ?
      ORDER BY received_at DESC LIMIT ?`;
    bindings = [addressId, folder, limit];
  }

  const result = await db.prepare(query).bind(...bindings).all<EmailListItem>();
  return result.results;
}

/**
 * Get emails for an address — backward compat (inbox only).
 */
export async function getEmailsByAddress(
  db: D1Database,
  addressId: string,
  sinceTimestamp?: number,
  limit: number = 50
): Promise<EmailListItem[]> {
  return getEmailsByFolder(db, addressId, 'inbox', sinceTimestamp, limit);
}

/**
 * Get a single email by ID with full body and attachments.
 */
export async function getEmailById(
  db: D1Database,
  emailId: string
): Promise<Email | null> {
  const email = await db
    .prepare(`SELECT * FROM emails WHERE id = ?`)
    .bind(emailId)
    .first<Email>();

  if (!email) return null;

  const attachResult = await db
    .prepare(`SELECT * FROM attachments WHERE email_id = ? ORDER BY filename`)
    .bind(emailId)
    .all<Attachment>();

  email.attachments = attachResult.results;
  return email;
}

/**
 * Mark an email as read.
 */
export async function markAsRead(db: D1Database, emailId: string): Promise<void> {
  await db.prepare(`UPDATE emails SET is_read = 1 WHERE id = ?`).bind(emailId).run();
}

/**
 * Move email to trash (soft delete).
 */
export async function moveToTrash(db: D1Database, emailId: string): Promise<void> {
  await db.prepare(`UPDATE emails SET folder = 'trash' WHERE id = ?`).bind(emailId).run();
}

/**
 * Restore email from trash to inbox.
 */
export async function restoreFromTrash(db: D1Database, emailId: string): Promise<void> {
  await db.prepare(`UPDATE emails SET folder = 'inbox' WHERE id = ?`).bind(emailId).run();
}

/**
 * Permanently delete an email.
 */
export async function deleteEmail(db: D1Database, emailId: string): Promise<void> {
  await db.prepare(`DELETE FROM emails WHERE id = ?`).bind(emailId).run();
}

/**
 * Toggle star on an email. Returns new star status.
 */
export async function toggleStar(db: D1Database, emailId: string): Promise<number> {
  const email = await db
    .prepare(`SELECT is_starred FROM emails WHERE id = ?`)
    .bind(emailId)
    .first<{ is_starred: number }>();

  if (!email) return 0;

  const newVal = email.is_starred ? 0 : 1;
  await db
    .prepare(`UPDATE emails SET is_starred = ? WHERE id = ?`)
    .bind(newVal, emailId)
    .run();

  return newVal;
}

/**
 * Get unread count for an address (inbox only).
 */
export async function getUnreadCount(
  db: D1Database,
  addressId: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM emails
       WHERE address_id = ? AND folder = 'inbox' AND is_read = 0`
    )
    .bind(addressId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/**
 * Delete expired emails. Returns counts.
 */
export async function deleteExpiredEmails(db: D1Database): Promise<{
  deleted_emails: number;
  deleted_attachments: number;
}> {
  const attachCount = await db
    .prepare(
      `SELECT COUNT(*) as count FROM attachments
       WHERE email_id IN (SELECT id FROM emails WHERE expires_at < unixepoch())`
    )
    .first<{ count: number }>();

  const result = await db
    .prepare(`DELETE FROM emails WHERE expires_at < unixepoch()`)
    .run();

  return {
    deleted_emails: result.meta.changes ?? 0,
    deleted_attachments: attachCount?.count ?? 0,
  };
}

/**
 * Delete expired email addresses.
 */
export async function deleteExpiredAddresses(db: D1Database): Promise<number> {
  const result = await db
    .prepare(`DELETE FROM email_addresses WHERE expires_at < unixepoch()`)
    .run();
  return result.meta.changes ?? 0;
}

/**
 * Insert an attachment record.
 */
export async function insertAttachment(
  db: D1Database,
  params: {
    emailId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    contentBase64: string;
  }
): Promise<Attachment> {
  const id = generateUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO attachments
       (id, email_id, filename, content_type, size_bytes, content_base64, storage_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    .bind(id, params.emailId, params.filename, params.contentType,
      params.sizeBytes, params.contentBase64, now)
    .run();

  return {
    id, email_id: params.emailId, filename: params.filename,
    content_type: params.contentType, size_bytes: params.sizeBytes,
    content_base64: params.contentBase64, storage_ref: null, created_at: now,
  };
}

/**
 * Get an attachment by ID.
 */
export async function getAttachmentById(
  db: D1Database,
  attachmentId: string
): Promise<Attachment | null> {
  return db.prepare(`SELECT * FROM attachments WHERE id = ?`)
    .bind(attachmentId).first<Attachment>();
}

/**
 * Get config value by key.
 */
export async function getConfig(
  db: D1Database,
  key: string
): Promise<string | null> {
  const row = await db
    .prepare(`SELECT value FROM config WHERE key = ?`)
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}
