import clsx from 'clsx';
import { Paperclip } from 'lucide-react';
import { useI18n } from '../i18n';
import type { EmailListItem as EmailListItemType } from '../types';
import { CountdownBadge } from './CountdownBadge';
import { formatRelativeTime, getInitials, getAvatarColor } from '../utils/format';

interface EmailListItemProps {
  email: EmailListItemType;
  isSelected: boolean;
  onClick: () => void;
}

export function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const { t } = useI18n();
  const initials = getInitials(email.from_name, email.from_address);
  const avatarColor = getAvatarColor(email.from_address);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 border',
        isSelected
          ? 'bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800'
          : !email.is_read
            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50 hover:border-blue-200 dark:hover:border-blue-800'
            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700'
      )}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={clsx(
                'text-sm font-medium truncate',
                !email.is_read && 'text-gray-900 dark:text-gray-100 font-semibold'
              )}
            >
              {email.from_name || email.from_address}
            </span>
            {!email.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {email.has_attachments > 0 && (
              <Paperclip size={12} className="text-gray-400 dark:text-gray-500" />
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatRelativeTime(email.received_at, t)}
            </span>
          </div>
        </div>

        <p
          className={clsx(
            'text-sm mt-0.5 truncate',
            !email.is_read
              ? 'text-gray-800 dark:text-gray-200 font-medium'
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          {email.subject || t.no_subject}
        </p>

        {email.body_text_preview && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {email.body_text_preview}
          </p>
        )}

        <div className="mt-1.5">
          <CountdownBadge expiresAt={email.expires_at} compact />
        </div>
      </div>
    </div>
  );
}
