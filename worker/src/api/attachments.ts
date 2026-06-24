import { AutoRouter } from 'itty-router';
import type { Env } from '../types';
import { error, binary } from '../utils/response';
import * as emailsDb from '../db/emails_db';

export const attachmentsRouter = AutoRouter();

/**
 * GET /api/attachments/:id — Get attachment metadata.
 */
attachmentsRouter.get('/api/attachments/:id', async (req, env: Env) => {
  const attachmentId = req.params.id;
  const attachment = await emailsDb.getAttachmentById(env.DB, attachmentId);

  if (!attachment) {
    return error('Attachment not found', 404);
  }

  return Response.json({
    success: true,
    data: {
      id: attachment.id,
      filename: attachment.filename,
      content_type: attachment.content_type,
      size_bytes: attachment.size_bytes,
    },
  });
});

/**
 * GET /api/attachments/:id/download — Download an attachment.
 * Returns the binary file content.
 */
attachmentsRouter.get('/api/attachments/:id/download', async (req, env: Env) => {
  const attachmentId = req.params.id;
  const attachment = await emailsDb.getAttachmentById(env.DB, attachmentId);

  if (!attachment) {
    return error('Attachment not found', 404);
  }

  if (attachment.content_base64) {
    // Decode base64 content
    const decoded = Uint8Array.from(
      atob(attachment.content_base64),
      (c) => c.charCodeAt(0)
    );
    return binary(decoded, attachment.content_type, attachment.filename);
  }

  // If stored in R2 or elsewhere — not yet implemented
  return error('Attachment content not available', 404);
});
