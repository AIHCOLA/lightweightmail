/**
 * Format a Unix timestamp (seconds) into relative time string.
 * Language-aware: uses the translations object passed in.
 */
export function formatRelativeTime(
  unixSeconds: number,
  t: {
    just_now: string;
    min_ago: string;
    mins_ago: string;
    hour_ago: string;
    hours_ago: string;
    day_ago: string;
    days_ago: string;
  }
): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 0) return t.just_now;
  if (diff < 60) return t.just_now;
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return mins === 1 ? t.min_ago : `${mins} ${t.mins_ago}`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return hours === 1 ? t.hour_ago : `${hours} ${t.hours_ago}`;
  }
  const days = Math.floor(diff / 86400);
  if (days < 7) return days === 1 ? t.day_ago : `${days} ${t.days_ago}`;

  return new Date(unixSeconds * 1000).toLocaleDateString(
    document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en-US',
    { month: 'short', day: 'numeric' }
  );
}

/**
 * Format a Unix timestamp to a full date/time string.
 */
export function formatDateTime(unixSeconds: number): string {
  const locale = document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'en-US';
  return new Date(unixSeconds * 1000).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format bytes into human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format remaining seconds into mm:ss display string.
 */
export function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return '00:00';
  const mins = Math.floor(remainingSeconds / 60);
  const secs = Math.floor(remainingSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get initials from a name or email for avatar display.
 */
export function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

/**
 * Generate an avatar color from a string (email or name).
 */
export function getAvatarColor(str: string): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
