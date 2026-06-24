import { Clock } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../i18n';
import { useCountdown } from '../hooks/useCountdown';

interface CountdownBadgeProps {
  expiresAt: number;
  compact?: boolean;
}

export function CountdownBadge({ expiresAt, compact = false }: CountdownBadgeProps) {
  const { t } = useI18n();
  const { display, isExpired, isWarning } = useCountdown(expiresAt);

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <Clock size={12} />
        {t.expired}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums transition-colors',
        isWarning
          ? 'text-orange-600 dark:text-orange-400 animate-pulse-warn'
          : 'text-gray-500 dark:text-gray-400'
      )}
    >
      <Clock size={12} />
      {compact ? display : display}
    </span>
  );
}
