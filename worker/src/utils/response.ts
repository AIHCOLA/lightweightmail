/**
 * Create a JSON response with proper headers.
 */
export function json(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

/**
 * Create a JSON error response.
 */
export function error(message: string, status: number = 400): Response {
  return json({ success: false, error: message }, status);
}

/**
 * Create a binary response for attachment downloads.
 */
export function binary(
  data: Uint8Array,
  contentType: string,
  filename: string
): Response {
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': data.length.toString(),
    },
  });
}
