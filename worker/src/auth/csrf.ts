/**
 * CSRF protection using double-submit cookie pattern.
 */
import { generateUUID } from '../utils/id';

/**
 * Generate a CSRF token and set it as a cookie on the response.
 * Returns the plaintext token to include in the response body.
 */
export function generateCsrfToken(): string {
  return generateUUID();
}

export function setCsrfCookie(response: Response, token: string): Response {
  response.headers.append(
    'Set-Cookie',
    `csrf_token=${token}; Path=/; SameSite=Strict; HttpOnly; Max-Age=3600`
  );
  return response;
}

/**
 * Validate that the CSRF cookie value matches the body/header token.
 */
export function validateCsrf(request: Request, bodyToken: string | null): boolean {
  if (!bodyToken) return false;
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/csrf_token=([^;]+)/);
  if (!match) return false;
  return match[1] === bodyToken;
}
