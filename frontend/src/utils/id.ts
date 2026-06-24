/**
 * Generate a UUID v4 using the Web Crypto API.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
