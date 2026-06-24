/**
 * Simple in-memory rate limiter using sliding window.
 * Resets on each Worker deployment (cold start).
 * Acceptable for an MVP temp email service.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited.
 * Returns true if the request is allowed, false if rate limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // First request or window expired — reset
    store.set(key, { count: 1, resetAt: now + windowSeconds });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Periodic cleanup of stale entries (call from cron or on each request).
 */
export function cleanupRateLimitStore(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}
