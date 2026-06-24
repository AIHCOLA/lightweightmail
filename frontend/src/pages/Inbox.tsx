import { useState, useEffect, useCallback, useMemo } from 'react';
import { Inbox, Send, FileText, Trash2, PenLine } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../i18n';
import { useAuth } from '../auth/useAuth';
import { useSession } from '../hooks/useSession';
import { useAddresses } from '../hooks/useAddresses';
import { useEmails } from '../hooks/useEmails';
import { useToast } from '../components/Toast';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { EmailList } from '../components/EmailList';
import { EmailDetail } from '../components/EmailDetail';
import { AddressGenerator } from '../components/AddressGenerator';
import { ComposePanel } from '../components/ComposePanel';
import { PageSpinner } from '../components/Spinner';
import type { FolderType } from '../types';

interface InboxPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

type ComposeMode = 'compose' | 'reply' | 'reply-all' | 'forward';

export function InboxPage({ darkMode, onToggleDarkMode }: InboxPageProps) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const { sessionId, isLoading: sessionLoading } = useSession();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
  const { addToast } = useToast();

  const {
    addresses,
    isLoading: addressesLoading,
    createAddress,
    removeAddress,
  } = useAddresses(isAuthenticated ? null : sessionId);
  const {
    emails,
    selectedEmail,
    isLoading: emailsLoading,
    isLoadingDetail,
    activeFolder,
    switchFolder,
    fetchEmailDetail,
    handleStar,
    handleDeleteDetail,
    handleRestore,
    closeDetail,
  } = useEmails(selectedAddressId, sessionId);

  const currentAddress = addresses.find(a => a.id === selectedAddressId) ?? null;

  const FOLDERS: { key: FolderType; label: string; icon: typeof Inbox }[] = useMemo(() => [
    { key: 'inbox', label: t.inbox, icon: Inbox },
    { key: 'sent', label: t.sent, icon: Send },
    { key: 'drafts', label: t.drafts, icon: FileText },
    { key: 'trash', label: t.trash, icon: Trash2 },
  ], [t]);

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) setSelectedAddressId(addresses[0].id);
    else if (addresses.length === 0) setSelectedAddressId(null);
  }, [addresses, selectedAddressId]);

  const handleCreateAddress = useCallback(async (prefix?: string) => {
    const result = await createAddress(prefix);
    if (result) { setSelectedAddressId(result.id); return result; }
    return null;
  }, [createAddress]);

  const handleDeleteAddress = useCallback(async (addressId: string) => {
    const ok = await removeAddress(addressId);
    if (ok) {
      addToast('info', t.toast_address_deleted);
      if (selectedAddressId === addressId) setSelectedAddressId(null);
    }
  }, [removeAddress, selectedAddressId, addToast, t]);

  const handleComposeSent = useCallback(() => {
    switchFolder('inbox');
  }, [switchFolder]);

  if (!isAuthenticated && sessionLoading) return <PageSpinner />;

  const folderHeaderText = activeFolder === 'inbox'
    ? t.inbox_for
    : activeFolder === 'sent'
      ? t.sent_from
      : FOLDERS.find(f => f.key === activeFolder)?.label ?? activeFolder;

  return (
    <div className="flex flex-col h-screen">
      <Header
        onCreateAddress={() => setShowGenerator(true)}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-72 xl:w-80 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800">
          {/* Address list */}
          <div className="flex-1 overflow-hidden">
            <Sidebar
              addresses={addresses}
              isLoading={addressesLoading}
              selectedAddressId={selectedAddressId}
              onSelectAddress={setSelectedAddressId}
              onDeleteAddress={handleDeleteAddress}
            />
          </div>

          {/* Folder nav + compose */}
          {currentAddress && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-3 shrink-0">
              <div className="space-y-0.5">
                {FOLDERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => switchFolder(f.key)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                      activeFolder === f.key
                        ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <f.icon size={16} />
                    <span>{f.label}</span>
                    {f.key === 'drafts' && (
                      <span className="ml-auto text-xs text-gray-400">{emails.length}</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setComposeMode('compose')}
                className="btn-primary w-full mt-3 gap-2"
              >
                <PenLine size={16} />
                {t.compose}
              </button>
            </div>
          )}
        </div>

        {/* Mobile: sidebar drawer overlay */}
        <div className="lg:hidden w-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              addresses={addresses}
              isLoading={addressesLoading}
              selectedAddressId={selectedAddressId}
              onSelectAddress={setSelectedAddressId}
              onDeleteAddress={handleDeleteAddress}
            />
          </div>
          {currentAddress && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-2 shrink-0">
              <div className="flex gap-1 overflow-x-auto">
                {FOLDERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => switchFolder(f.key)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors',
                      activeFolder === f.key
                        ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <f.icon size={14} />
                    {f.label}
                  </button>
                ))}
                <button onClick={() => setComposeMode('compose')} className="btn-primary text-xs gap-1.5 px-3 py-2 shrink-0">
                  <PenLine size={14} /> {t.compose}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email list */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 dark:bg-gray-900/30">
          {currentAddress && (
            <div className="hidden lg:flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{folderHeaderText}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{currentAddress.full_address}</span>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {currentAddress ? (
              <EmailList
                emails={emails}
                isLoading={emailsLoading}
                selectedEmail={selectedEmail}
                onSelectEmail={fetchEmailDetail}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                {t.select_or_create}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email detail */}
      <EmailDetail
        email={selectedEmail}
        isLoading={isLoadingDetail}
        currentAddress={currentAddress}
        onClose={closeDetail}
        onDelete={handleDeleteDetail}
        onRestore={handleRestore}
        onStar={handleStar}
        onAction={(action) => setComposeMode(action)}
      />

      {/* Compose / Reply / Forward */}
      {composeMode && currentAddress && (
        <ComposePanel
          mode={composeMode}
          originalEmail={composeMode !== 'compose' ? selectedEmail : null}
          address={currentAddress}
          sessionId={isAuthenticated ? null : sessionId!}
          onClose={() => setComposeMode(null)}
          onSent={handleComposeSent}
        />
      )}

      {/* Address generator */}
      <AddressGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onCreateAddress={handleCreateAddress}
      />
    </div>
  );
}
