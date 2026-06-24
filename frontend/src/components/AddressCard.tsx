import { Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../i18n';
import type { EmailAddress } from '../types';
import { CopyButton } from './CopyButton';
import { CountdownBadge } from './CountdownBadge';
import { useCountdown } from '../hooks/useCountdown';

interface AddressCardProps {
  address: EmailAddress;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function AddressCard({ address, isSelected, onSelect, onDelete }: AddressCardProps) {
  const { t } = useI18n();
  const { isExpired } = useCountdown(address.expires_at);

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group relative p-3 rounded-xl cursor-pointer transition-all duration-150 border',
        isSelected
          ? 'bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800 shadow-sm'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'text-sm font-medium truncate block',
                isExpired && 'line-through text-gray-400 dark:text-gray-600'
              )}
            >
              {address.local_part}
            </span>
            {address.unread_count ? (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold leading-none">
                {address.unread_count > 99 ? '99+' : address.unread_count}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {address.full_address}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <CopyButton text={address.full_address} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="btn-ghost p-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            title={t.delete_address}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <CountdownBadge expiresAt={address.expires_at} compact />
      </div>
    </div>
  );
}
