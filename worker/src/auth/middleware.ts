/**
 * Auth middleware for itty-router.
 * requireAuth — returns 401 if no valid JWT.
 * optionalAuth — attaches auth context if JWT present, continues either way.
 */
import type { Env, AuthContext } from '../types';
import { verifyToken } from './jwt';
import { error } from '../utils/response';

// Attach auth to the request object (itty-router puts it on a plain object proxy)
function attachAuth(req: Request, context: AuthContext) {
  (req as unknown as Record<string, unknown> & { auth: AuthContext }).auth = context;
}

export function getAuth(req: Request): AuthContext | null {
  return (req as unknown as Record<string, unknown> & { auth?: AuthContext }).auth ?? null;
}

/**
 * requireAuth middleware — rejects unauthenticated requests with 401.
 */
export function requireAuth(env: Env) {
  return async (req: Request) => {
    const secret = env.JWT_SECRET;
    if (!secret) {
      return error('Authentication not configured', 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return error('Authentication required', 401);
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token, secret);
    if (!payload) {
      return error('Token invalid or expired', 401);
    }

    attachAuth(req, {
      user_id: payload.sub,
      phone_verified: payload.phone_verified,
    });
    // Return undefined to continue to the next handler
    return undefined;
  };
}

/**
 * optionalAuth middleware — attaches auth if JWT present, always continues.
 */
export function optionalAuth(env: Env) {
  return async (req: Request) => {
    const secret = env.JWT_SECRET;
    if (!secret) return undefined;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token, secret);
      if (payload) {
        attachAuth(req, {
          user_id: payload.sub,
          phone_verified: payload.phone_verified,
        });
      }
    }
    return undefined;
  };
}
