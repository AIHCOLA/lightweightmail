import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../i18n';
import { copyToClipboard } from '../utils/clipboard';
import { useToast } from './Toast';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  const { addToast } = useToast();

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      addToast('success', t.toast_copied);
      setTimeout(() => setCopied(false), 2000);
    } else {
      addToast('error', t.toast_copy_failed);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        'btn-ghost text-xs gap-1.5',
        copied && 'text-green-600 dark:text-green-400',
        className
      )}
      title={t.copy}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {label && <span>{copied ? t.copied : label}</span>}
    </button>
  );
}
