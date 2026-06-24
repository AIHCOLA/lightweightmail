import { Mail, Inbox } from 'lucide-react';
import { useI18n } from '../i18n';

interface EmptyStateProps {
  type?: 'no-address' | 'no-emails';
}

export function EmptyState({ type = 'no-emails' }: EmptyStateProps) {
  const { t } = useI18n();

  if (type === 'no-address') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Mail size={28} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t.no_addresses}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          {t.no_addresses_desc}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Inbox size={28} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {t.waiting_for_emails}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {t.waiting_for_emails_desc}
      </p>
    </div>
  );
}
