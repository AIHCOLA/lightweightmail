import { AutoRouter } from 'itty-router';
import type { Env, SendEmailRequest } from '../types';
import { json, error } from '../utils/response';
import { sendViaMailChannels } from '../email_sender';
import * as emailsDb from '../db/emails_db';
import * as addressesDb from '../db/addresses_db';

export const emailsRouter = AutoRouter();

/**
 * GET /api/emails?address_id=xxx&folder=inbox&since=unix_ts&limit=50
 */
emailsRouter.get('/api/emails', async (req, env: Env) => {
  const addressId = req.query.address_id as string | undefined;
  if (!addressId) return error('address_id is required', 400);

  const folder = (req.query.folder as string) || 'inbox';
  const sinceStr = req.query.since as string | undefined;
  const limitStr = req.query.limit as string | undefined;
  const since = sinceStr ? parseInt(sinceStr) : undefined;
  const limit = limitStr ? Math.min(parseInt(limitStr), 100) : 50;

  const emails = await emailsDb.getEmailsByFolder(env.DB, addressId, folder, since, limit);

  return json({
    success: true,
    data: emails,
    meta: {
      count: emails.length,
      folder,
      since: since ?? null,
      fetched_at: Math.floor(Date.now() / 1000),
    },
  });
});

/**
 * GET /api/emails/:id — Full email detail. Auto marks as read.
 */
emailsRouter.get('/api/emails/:id', async (req, env: Env) => {
  const email = await emailsDb.getEmailById(env.DB, req.params.id);
  if (!email) return error('Email not found', 404);
  await emailsDb.markAsRead(env.DB, req.params.id);
  return json({ success: true, data: email });
});

/**
 * POST /api/emails/send — Send an email and save to sent folder.
 */
emailsRouter.post('/api/emails/send', async (req, env: Env) => {
  let body: SendEmailRequest;
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  // Validate required fields
  if (!body.address_id || !body.session_id) return error('address_id and session_id are required', 400);
  if (!body.to?.length) return error('At least one recipient is required', 400);
  if (!body.subject?.trim()) return error('Subject is required', 400);
  if (!body.body_text?.trim()) return error('Email body is required', 400);

  // Verify address ownership
  const address = await addressesDb.getAddressById(env.DB, body.address_id);
  if (!address) return error('Address not found', 404);
  if (address.session_id !== body.session_id) return error('Unauthorized', 403);

  // If it's a draft, just save
  if (body.is_draft) {
    const draft = await emailsDb.saveSentEmail(env.DB, {
      addressId: body.address_id,
      fromAddress: address.full_address,
      toAddress: body.to.join(', '),
      cc: body.cc?.join(', ') ?? null,
      bcc: body.bcc?.join(', ') ?? null,
      subject: body.subject,
      bodyText: body.body_text,
      bodyHtml: body.body_html ?? null,
      folder: 'drafts',
      inReplyTo: body.in_reply_to ?? null,
    });
    return json({ success: true, data: { ...draft, folder: 'drafts' } }, 201);
  }

  // Save a copy to sent folder first
  const sent = await emailsDb.saveSentEmail(env.DB, {
    addressId: body.address_id,
    fromAddress: address.full_address,
    toAddress: body.to.join(', '),
    cc: body.cc?.join(', ') ?? null,
    bcc: body.bcc?.join(', ') ?? null,
    subject: body.subject,
    bodyText: body.body_text,
    bodyHtml: body.body_html ?? null,
    folder: 'sent',
    inReplyTo: body.in_reply_to ?? null,
  });

  // Attempt to send via MailChannels
  const sendResult = await sendViaMailChannels(
    {
      from: { email: address.full_address },
      to: body.to.map((e) => ({ email: e })),
      cc: body.cc?.map((e) => ({ email: e })),
      bcc: body.bcc?.map((e) => ({ email: e })),
      subject: body.subject,
      text: body.body_text,
      html: body.body_html ?? undefined,
    },
    env.SEND_KEY
  );

  if (!sendResult.success) {
    return json({
      success: false,
      error: sendResult.error ?? 'Failed to send email',
      data: sent, // Still return the saved copy
    });
  }

  return json({
    success: true,
    data: sent,
    meta: { message: 'Email sent successfully' },
  }, 201);
});

/**
 * PUT /api/emails/:id/star — Toggle star.
 */
emailsRouter.put('/api/emails/:id/star', async (req, env: Env) => {
  const newVal = await emailsDb.toggleStar(env.DB, req.params.id);
  return json({ success: true, data: { is_starred: newVal } });
});

/**
 * PUT /api/emails/:id/trash — Move to trash.
 */
emailsRouter.put('/api/emails/:id/trash', async (req, env: Env) => {
  await emailsDb.moveToTrash(env.DB, req.params.id);
  return json({ success: true, message: 'Moved to trash' });
});

/**
 * PUT /api/emails/:id/restore — Restore from trash.
 */
emailsRouter.put('/api/emails/:id/restore', async (req, env: Env) => {
  await emailsDb.restoreFromTrash(env.DB, req.params.id);
  return json({ success: true, message: 'Restored from trash' });
});

/**
 * DELETE /api/emails/:id — Permanently delete.
 */
emailsRouter.delete('/api/emails/:id', async (req, env: Env) => {
  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body', 400);
  }
  if (!body.session_id) return error('session_id is required', 400);

  const email = await emailsDb.getEmailById(env.DB, req.params.id);
  if (!email) return error('Email not found', 404);

  const address = await addressesDb.getAddressById(env.DB, email.address_id);
  if (!address || address.session_id !== body.session_id) return error('Unauthorized', 403);

  await emailsDb.deleteEmail(env.DB, req.params.id);
  return json({ success: true, message: 'Email permanently deleted' });
});
