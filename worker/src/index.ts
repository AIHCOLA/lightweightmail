import { router } from './api/router';
import { handleEmail } from './email_handler';
import { cleanupRateLimitStore } from './utils/rate_limit';
import * as emailsDb from './db/emails_db';
import type { Env } from './types';

/**
 * Cloudflare Worker entry point.
 * Handles both:
 * - fetch(): HTTP API requests
 * - email(): Incoming email via Email Routing
 * - scheduled(): Cron trigger for cleanup
 */
export default {
  /**
   * HTTP fetch handler — serves the REST API.
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Periodic cleanup of rate limiter store
    cleanupRateLimitStore();

    return router.fetch(request, env, ctx);
  },

  /**
   * Email handler — called when Cloudflare Email Routing receives an email.
   */
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    await handleEmail(message, env, ctx);
  },

  /**
   * Scheduled handler — called by cron trigger for cleanup.
   */
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    console.log('Running scheduled cleanup...');

    const emailResult = await emailsDb.deleteExpiredEmails(env.DB);
    const addressResult = await emailsDb.deleteExpiredAddresses(env.DB);

    console.log(
      `Cleanup complete: ` +
      `${emailResult.deleted_emails} emails, ` +
      `${emailResult.deleted_attachments} attachments, ` +
      `${addressResult} addresses deleted`
    );
  },
};
