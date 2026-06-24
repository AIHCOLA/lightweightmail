import { AutoRouter, cors } from 'itty-router';
import type { Env } from '../types';
import { json, error } from '../utils/response';
import { sessionsRouter } from './sessions';
import { addressesRouter } from './addresses';
import { emailsRouter } from './emails';
import { attachmentsRouter } from './attachments';
import { cleanupRouter } from './cleanup';
import { authRouter } from './auth';
import * as emailsDb from '../db/emails_db';

const { preflight, corsify } = cors({
  origin: (origin: string) => {
    // Allow dev origins and the production domain
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8787',
    ];
    // Always allow if no origin (e.g., curl, server-to-server)
    if (!origin) return '';
    if (allowed.includes(origin)) return origin;
    // Allow any subdomain of aihcolamail.xyz
    if (origin.endsWith('.aihcolamail.xyz') || origin === 'https://aihcolamail.xyz') return origin;
    // In dev, allow all localhost ports
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return origin;
    return '';
  },
  allowMethods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowHeaders: 'Content-Type, Authorization, X-CSRF-Token, X-Session-Id',
  maxAge: 86400,
});

// Create the main router
export const router = AutoRouter({
  before: [preflight],
  finally: [corsify],
});

// Mount sub-routers
router.all('/api/auth/*', authRouter.fetch);
router.all('/api/sessions/*', sessionsRouter.fetch);
router.all('/api/addresses/*', addressesRouter.fetch);
router.all('/api/emails/*', emailsRouter.fetch);
router.all('/api/attachments/*', attachmentsRouter.fetch);
router.all('/api/internal/*', cleanupRouter.fetch);

// Health check endpoint
router.get('/api/health', async (_req, env: Env) => {
  try {
    await env.DB.prepare('SELECT 1').first();
    return json({
      status: 'ok',
      db: 'connected',
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch {
    return error('Database connection failed', 500);
  }
});

// Config endpoint (public config values for the frontend)
router.get('/api/config', async (req, env: Env) => {
  const emailTtl = (await emailsDb.getConfig(env.DB, 'email_ttl_minutes')) ?? '10';
  const addressTtl = (await emailsDb.getConfig(env.DB, 'address_ttl_hours')) ?? '24';
  const maxAddresses = (await emailsDb.getConfig(env.DB, 'max_addresses_per_session')) ?? '5';
  const maxAttachmentSize = (await emailsDb.getConfig(env.DB, 'max_attachment_size_bytes')) ?? '524288';
  const pollingIntervalMs = '5000';

  return json({
    email_ttl_minutes: parseInt(emailTtl),
    address_ttl_hours: parseInt(addressTtl),
    max_addresses_per_session: parseInt(maxAddresses),
    max_attachment_size_bytes: parseInt(maxAttachmentSize),
    polling_interval_ms: parseInt(pollingIntervalMs),
    // Tell frontend which auth methods are available
    sms_enabled: true,
    oauth_github_enabled: !!env.GITHUB_CLIENT_ID,
    oauth_google_enabled: !!env.GOOGLE_CLIENT_ID,
  });
});

// 404 handler — only for /api/* routes
router.all('/api/*', () => error('Not found', 404));
