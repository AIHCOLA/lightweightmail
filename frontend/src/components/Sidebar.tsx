import { useI18n } from '../i18n';
import type { EmailAddress } from '../types';
import { AddressCard } from './AddressCard';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';

interface SidebarProps {
  addresses: EmailAddress[];
  isLoading: boolean;
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onDeleteAddress: (id: string) => void;
}

export function Sidebar({
  addresses,
  isLoading,
  selectedAddressId,
  onSelectAddress,
  onDeleteAddress,
}: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside className="w-full h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t.email_addresses}
          {!isLoading && addresses.length > 0 && (
            <span className="ml-1 text-gray-400 dark:text-gray-500">
              ({addresses.length})
            </span>
          )}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : addresses.length === 0 ? (
          <EmptyState type="no-address" />
        ) : (
          addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              isSelected={selectedAddressId === addr.id}
              onSelect={() => onSelectAddress(addr.id)}
              onDelete={() => onDeleteAddress(addr.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
