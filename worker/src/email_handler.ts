import PostalMime from 'postal-mime';
import type { Env } from './types';
import { sanitizeHtml } from './sanitizer';
import * as addressesDb from './db/addresses_db';
import * as emailsDb from './db/emails_db';

/**
 * Handle an incoming email via Cloudflare Email Routing.
 * This is called when an email is sent to any address @<domain>.
 */
export async function handleEmail(
  message: ForwardableEmailMessage,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  try {
    // Parse the raw email
    const rawSize = message.rawSize ?? 0;

    // Reject emails over 10MB
    if (rawSize > 10 * 1024 * 1024) {
      console.warn(`Email too large: ${rawSize} bytes, rejecting`);
      return;
    }

    // Get recipient address
    const toAddress = message.to?.toLowerCase().trim();
    if (!toAddress) {
      console.warn('No recipient address found, dropping email');
      return;
    }

    // Look up the address in our database
    const address = await addressesDb.getAddressByFullAddress(env.DB, toAddress);
    if (!address) {
      console.warn(`Address not found or inactive: ${toAddress}, dropping email`);
      return;
    }

    // Parse the email content using postal-mime
    const parser = new PostalMime();
    const parsed = await parser.parse(message.raw);

    // Extract fields
    const fromAddress = parsed.from?.address ?? 'unknown@sender';
    const fromName = parsed.from?.name ?? null;
    const subject = parsed.subject ?? '(No Subject)';
    const bodyText = parsed.text ?? null;
    let bodyHtml = parsed.html ?? null;

    // Sanitize HTML body
    if (bodyHtml) {
      bodyHtml = sanitizeHtml(bodyHtml);
    }

    // Get TTL config
    const ttlMinutes = parseInt(
      (await emailsDb.getConfig(env.DB, 'email_ttl_minutes')) ?? '10'
    );
    const maxAttachmentSize = parseInt(
      (await emailsDb.getConfig(env.DB, 'max_attachment_size_bytes')) ?? '524288'
    );

    const hasAttachments = (parsed.attachments && parsed.attachments.length > 0) ? 1 : 0;

    // Insert the email into D1
    const email = await emailsDb.insertEmail(env.DB, {
      addressId: address.id,
      fromAddress,
      fromName,
      toAddress,
      subject,
      bodyText,
      bodyHtml,
      ttlMinutes,
      rawSize,
      hasAttachments,
    });

    // Process attachments
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        // Get attachment content as base64
        let contentBase64: string | null = null;
        let attSize = 0;
        try {
          if (att.content instanceof Uint8Array) {
            attSize = att.content.byteLength;
            contentBase64 = btoa(
              Array.from(att.content as Uint8Array, (byte: number) => String.fromCharCode(byte)).join('')
            );
          } else if (typeof att.content === 'string') {
            attSize = att.content.length;
            contentBase64 = att.content;
          } else if (att.content) {
            // Try to get content via mime decoding
            contentBase64 = att.content.toString();
            attSize = contentBase64.length;
          }
        } catch {
          console.warn(`Failed to decode attachment: ${att.filename}`);
          continue;
        }

        if (!contentBase64) continue;

        // Skip attachments that are too large
        if (attSize > maxAttachmentSize) {
          console.warn(
            `Attachment too large: ${att.filename} (${attSize} bytes), skipping`
          );
          continue;
        }

        await emailsDb.insertAttachment(env.DB, {
          emailId: email.id,
          filename: att.filename ?? 'unnamed-attachment',
          contentType: att.mimeType ?? 'application/octet-stream',
          sizeBytes: attSize,
          contentBase64,
        });
      }
    }

    console.log(
      `Email stored: ${email.id} from ${fromAddress} to ${toAddress} (${rawSize} bytes)`
    );
  } catch (err) {
    console.error('Error processing email:', err);
    // Don't rethrow — silently consume the email to prevent bounce
  }
}
