import { AutoRouter } from 'itty-router';
import type { Env } from '../types';
import { json, error } from '../utils/response';
import { sanitizeHtml } from '../sanitizer';
import * as emailsDb from '../db/emails_db';
import * as addressesDb from '../db/addresses_db';
import { generateUUID } from '../utils/id';

export const cleanupRouter = AutoRouter();

/**
 * POST /api/internal/test-email — Inject a test email directly into the DB.
 * Only available in local development (no CLEANUP_SECRET set).
 * Body: { to_address: string, from_address?: string, from_name?: string,
 *         subject?: string, body_text?: string, body_html?: string }
 */
cleanupRouter.post('/api/internal/test-email', async (req, env: Env) => {
  // Only allow in dev when CLEANUP_SECRET is not configured
  if (env.CLEANUP_SECRET) {
    return error('Test endpoint not available in production', 403);
  }

  let body: {
    to_address?: string;
    from_address?: string;
    from_name?: string;
    subject?: string;
    body_text?: string;
    body_html?: string;
  };
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const toAddress = body.to_address?.toLowerCase().trim();
  if (!toAddress) {
    return error('to_address is required', 400);
  }

  // Look up the address
  const address = await addressesDb.getAddressByFullAddress(env.DB, toAddress);
  if (!address) {
    return error(`Address not found: ${toAddress}`, 404);
  }

  const fromAddress = body.from_address || 'test@sender.com';
  const fromName = body.from_name || 'Test Sender';
  const subject = body.subject || 'Test Email';
  const bodyText = body.body_text || 'This is a test email body.';
  let bodyHtml = body.body_html || null;

  if (bodyHtml) {
    bodyHtml = sanitizeHtml(bodyHtml);
  }

  const ttlMinutes = parseInt(
    (await emailsDb.getConfig(env.DB, 'email_ttl_minutes')) ?? '10'
  );

  const email = await emailsDb.insertEmail(env.DB, {
    addressId: address.id,
    fromAddress,
    fromName,
    toAddress,
    subject,
    bodyText,
    bodyHtml,
    ttlMinutes,
    rawSize: (bodyText.length + (bodyHtml?.length ?? 0)),
    hasAttachments: 0,
  });

  return json({
    success: true,
    data: email,
  }, 201);
});

/**
 * POST /api/internal/cleanup — Cron-triggered cleanup of expired data.
 * Protected by X-Cleanup-Key header.
 */
cleanupRouter.post('/api/internal/cleanup', async (req, env: Env) => {
  const cleanupKey = req.headers.get('X-Cleanup-Key');

  if (!cleanupKey || cleanupKey !== env.CLEANUP_SECRET) {
    return error('Unauthorized', 401);
  }

  const emailResult = await emailsDb.deleteExpiredEmails(env.DB);
  const addressResult = await emailsDb.deleteExpiredAddresses(env.DB);

  return json({
    success: true,
    data: {
      deleted_emails: emailResult.deleted_emails,
      deleted_attachments: emailResult.deleted_attachments,
      deleted_addresses: addressResult,
    },
  });
});
