import { AutoRouter } from 'itty-router';
import type { Env } from '../types';
import { json, error } from '../utils/response';
import { checkRateLimit } from '../utils/rate_limit';
import * as sessionsDb from '../db/sessions_db';

export const sessionsRouter = AutoRouter();

/**
 * POST /api/sessions — Create a new session.
 */
sessionsRouter.post('/api/sessions', async (req, env: Env) => {
  const clientIP = req.headers.get('cf-connecting-ip') ?? 'unknown';
  const ipHash = clientIP; // In production, hash this with SHA256

  if (!checkRateLimit(`session:${ipHash}`, 20, 60)) {
    return error('Too many requests. Please try again later.', 429);
  }

  let userAgent: string | null = null;
  try {
    const body = await req.json() as { user_agent?: string };
    userAgent = body.user_agent ?? null;
  } catch {
    // Body is optional
  }

  const session = await sessionsDb.createSession(env.DB, userAgent, ipHash);

  return json({
    success: true,
    data: session,
  }, 201);
});

/**
 * GET /api/sessions/:id — Get session details.
 */
sessionsRouter.get('/api/sessions/:id', async (req, env: Env) => {
  const sessionId = req.params.id;
  const session = await sessionsDb.getSession(env.DB, sessionId);

  if (!session) {
    return error('Session not found', 404);
  }

  // Touch the session to update last_active_at
  await sessionsDb.touchSession(env.DB, sessionId);

  return json({
    success: true,
    data: session,
  });
});
