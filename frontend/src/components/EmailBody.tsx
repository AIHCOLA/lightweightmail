import { useRef, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { sanitizeAndRender } from '../utils/sanitize';

interface EmailBodyProps {
  html: string | null;
  text: string | null;
}

export function EmailBody({ html, text }: EmailBodyProps) {
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState('300px');

  useEffect(() => {
    if (!html || !iframeRef.current) return;

    const sanitized = sanitizeAndRender(html);

    const doc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          :root { color-scheme: light dark; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          @media (prefers-color-scheme: dark) {
            body { color: #e5e7eb; background: #111827; }
            a { color: #93c5fd; }
          }
          img { max-width: 100% !important; height: auto !important; }
          a { color: #3b82f6; }
          table { max-width: 100%; }
          pre { white-space: pre-wrap; overflow-x: auto; }
        </style>
      </head>
      <body>${sanitized}</body>
      </html>
    `;

    const iframe = iframeRef.current;
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;

    iframe.onload = () => {
      try {
        const height = iframe.contentDocument?.body?.scrollHeight ?? 300;
        setIframeHeight(`${Math.max(height + 20, 300)}px`);
      } catch {
        // Cross-origin — keep default
      }
    };

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [html]);

  if (!html && text) {
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        {text}
      </pre>
    );
  }

  if (!html && !text) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500 italic p-4">
        {t.no_content}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      style={{
        width: '100%',
        height: iframeHeight,
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
      }}
      title={t.email_content}
      className="bg-white dark:bg-gray-950"
    />
  );
}
