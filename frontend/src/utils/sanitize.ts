import DOMPurify from 'dompurify';

/**
 * Client-side HTML sanitization using DOMPurify.
 * This is the second layer of defense after server-side sanitization.
 */
export function sanitizeAndRender(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'p', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'ul', 'ol', 'li', 'b', 'i', 'u', 'strong', 'em', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'span', 'sub', 'sup', 'dl', 'dt', 'dd', 'small', 's', 'del', 'ins',
      'caption', 'colgroup', 'col', 'figure', 'figcaption', 'abbr', 'cite',
      'kbd', 'mark', 'q', 'samp', 'var', 'wbr', 'address', 'article',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class', 'id', 'colspan', 'rowspan', 'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'bgcolor', 'color'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
}
