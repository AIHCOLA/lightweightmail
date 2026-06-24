import { useState } from 'react';
import { X, Shuffle, Plus } from 'lucide-react';
import { useI18n } from '../i18n';
import { useToast } from './Toast';
import { Spinner } from './Spinner';

interface AddressGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAddress: (prefix?: string) => Promise<{ full_address: string } | null>;
}

export function AddressGenerator({ isOpen, onClose, onCreateAddress }: AddressGeneratorProps) {
  const [prefix, setPrefix] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useI18n();
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleRandom = async () => {
    setIsLoading(true);
    const result = await onCreateAddress();
    if (result) {
      addToast('success', `${t.toast_address_created}: ${result.full_address}`);
      setPrefix('');
      onClose();
    }
    setIsLoading(false);
  };

  const handleCustom = async () => {
    const trimmed = prefix.trim();
    if (trimmed.length < 3) {
      addToast('error', t.address_validation_min);
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      addToast('error', t.address_validation_chars);
      return;
    }
    if (/^[._-]/.test(trimmed) || /[._-]$/.test(trimmed)) {
      addToast('error', t.address_validation_start_end);
      return;
    }

    setIsLoading(true);
    const result = await onCreateAddress(trimmed);
    if (result) {
      addToast('success', `${t.toast_address_created}: ${result.full_address}`);
      setPrefix('');
      onClose();
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md mx-4 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t.generate_address}</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Random generate */}
          <button
            onClick={handleRandom}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-gray-50 dark:bg-gray-800/50"
          >
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <Shuffle size={20} className="text-primary-500" />
            )}
            <div className="text-left">
              <div className="font-medium">{t.random_address}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t.random_address_desc}
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.or_divider}</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Custom address */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t.custom_address}
            </label>
            <div className="flex items-stretch gap-0">
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toLowerCase())}
                placeholder={t.custom_address_placeholder}
                className="input flex-1 rounded-r-none border-r-0"
                onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
                autoFocus
              />
              <span className="inline-flex items-center px-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-700 rounded-r-lg">
                @aihcolamail.xyz
              </span>
              <button
                onClick={handleCustom}
                disabled={isLoading || prefix.trim().length < 3}
                className="btn-primary ml-2"
              >
                {isLoading ? <Spinner size="sm" /> : <Plus size={16} />}
                {t.create}
              </button>
            </div>
            {prefix.trim() && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 font-medium">
                → {prefix.trim()}@aihcolamail.xyz
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {t.address_chars_hint}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
