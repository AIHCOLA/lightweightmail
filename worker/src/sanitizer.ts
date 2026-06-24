/**
 * Server-side HTML sanitizer for incoming email HTML content.
 * Uses a two-pass approach:
 * 1. Strip entire blocked elements (script, iframe, etc.)
 * 2. Strip dangerous attributes from remaining elements
 */

// Tags that are entirely removed (with their content)
const BLOCKED_TAGS_FULL = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'applet',
  'frame', 'frameset', 'noscript', 'link', 'meta',
]);

// Tags that are removed but their children are kept
const BLOCKED_TAGS_KEEP_CHILDREN = new Set([
  'form', 'input', 'button', 'select', 'textarea', 'fieldset',
]);

// Regex patterns for sanitization
const BLOCKED_TAG_REGEX = new RegExp(
  `<\\s*(?:${[...BLOCKED_TAGS_FULL].join('|')})\\b[^>]*>[\\s\\S]*?<\\s*/\\s*(?:${[...BLOCKED_TAGS_FULL].join('|')})\\s*>|<\\s*(?:${[...BLOCKED_TAGS_FULL].join('|')})\\b[^>]*/?\\s*>`,
  'gi'
);

const BLOCKED_TAG_KEEP_REGEX = new RegExp(
  `<\\s*/?\\s*(?:${[...BLOCKED_TAGS_KEEP_CHILDREN].join('|')})\\b[^>]*/?\\s*>`,
  'gi'
);

// Event handler attributes to strip
const EVENT_ATTR_REGEX = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// javascript: and data: URLs
const DANGEROUS_URL_REGEX = /\b(href|src|action|formaction)\s*=\s*"(?:javascript|data):[^"]*"/gi;
const DANGEROUS_URL_REGEX_SINGLE = /\b(href|src|action|formaction)\s*=\s*'(?:javascript|data):[^']*'/gi;

/**
 * First pass: Strip style tags and their content.
 */
function stripStyleContent(html: string): string {
  return html.replace(
    /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,
    ''
  ).replace(
    /<style\b[^>]*\/>/gi,
    ''
  );
}

/**
 * Sanitize HTML email body.
 * Strips dangerous tags, event handlers, and dangerous URLs.
 * Returns cleaned HTML safe for rendering in a sandboxed iframe.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // Pass 1: Strip style tags and content
  cleaned = stripStyleContent(cleaned);

  // Pass 2: Remove fully blocked tags (script, iframe, object, etc.)
  cleaned = cleaned.replace(BLOCKED_TAG_REGEX, '');

  // Pass 3: Remove container-only blocked tags (form, input, etc.) but keep their children
  cleaned = cleaned.replace(BLOCKED_TAG_KEEP_REGEX, '');

  // Pass 4: Strip event handler attributes (onclick, onload, onerror, etc.)
  cleaned = cleaned.replace(EVENT_ATTR_REGEX, '');

  // Pass 5: Strip javascript: and data: URLs from href and src
  cleaned = cleaned.replace(DANGEROUS_URL_REGEX, '$1="#"');
  cleaned = cleaned.replace(DANGEROUS_URL_REGEX_SINGLE, "$1='#'");

  // Pass 6: Remove inline style attributes that can be dangerous
  // We keep style attributes but could add expression() checks here
  cleaned = cleaned.replace(/style\s*=\s*".*?expression\s*\(.*?".*?"/gi, '');

  return cleaned;
}
