import { X, Star, Reply, ReplyAll, Forward, Trash2, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Email, EmailAddress } from '../types';
import { EmailBody } from './EmailBody';
import { AttachmentList } from './AttachmentList';
import { formatDateTime, formatBytes } from '../utils/format';
import { Spinner } from './Spinner';

type Action = 'reply' | 'reply-all' | 'forward' | 'compose';

interface EmailDetailProps {
  email: Email | null;
  isLoading: boolean;
  currentAddress: EmailAddress | null;
  onClose: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onStar: () => void;
  onAction: (action: Action) => void;
}

export function EmailDetail({ email, isLoading, currentAddress, onClose, onDelete, onRestore, onStar, onAction }: EmailDetailProps) {
  const { t } = useI18n();

  if (!email && !isLoading) return null;

  const isTrash = email?.folder === 'trash';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[560px] lg:w-[680px] z-50 bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800 animate-slide-in overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0 flex-wrap gap-2">
          <h3 className="font-semibold text-sm">{t.email_detail}</h3>
          <div className="flex items-center gap-1 flex-wrap">
            {!isTrash && (
              <>
                <button onClick={onStar} className="btn-ghost p-1.5 rounded-lg" title={t.star}>
                  <Star size={16} className={email?.is_starred ? 'fill-yellow-400 text-yellow-400' : ''} />
                </button>
                <button onClick={() => onAction('reply')} className="btn-ghost p-1.5 rounded-lg" title={t.reply}>
                  <Reply size={16} />
                </button>
                <button onClick={() => onAction('reply-all')} className="btn-ghost p-1.5 rounded-lg" title={t.reply_all}>
                  <ReplyAll size={16} />
                </button>
                <button onClick={() => onAction('forward')} className="btn-ghost p-1.5 rounded-lg" title={t.forward}>
                  <Forward size={16} />
                </button>
              </>
            )}
            {isTrash && onRestore && (
              <button onClick={onRestore} className="btn-ghost p-1.5 rounded-lg text-green-600" title={t.restore}>
                <RotateCcw size={16} />
              </button>
            )}
            <button
              onClick={onDelete}
              className="btn-ghost p-1.5 rounded-lg text-red-600 dark:text-red-400"
              title={t.delete}
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg" title={t.close}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
          ) : email ? (
            <div className="p-5">
              <div className="space-y-3 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug break-words">
                  {email.subject || t.no_subject}
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <div className="min-w-0 max-w-full">
                    <span className="text-gray-500 dark:text-gray-400">{t.from_label}: </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 break-all">
                      {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}
                    </span>
                  </div>
                  <div className="min-w-0 max-w-full">
                    <span className="text-gray-500 dark:text-gray-400">{t.to_label}: </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 break-all">{email.to_address}</span>
                  </div>
                  {email.cc && (
                    <div className="min-w-0 max-w-full">
                      <span className="text-gray-500 dark:text-gray-400">{t.cc_label}: </span>
                      <span className="text-gray-700 dark:text-gray-300 break-all">{email.cc}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t.date_label}: </span>
                    <span className="text-gray-700 dark:text-gray-300">{formatDateTime(email.received_at)}</span>
                  </div>
                  {email.size_bytes ? (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t.size_label}: </span>
                      <span className="text-gray-700 dark:text-gray-300">{formatBytes(email.size_bytes)}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 mb-6" />

              <EmailBody html={email.body_html} text={email.body_text} />

              {email.attachments && email.attachments.length > 0 && (
                <AttachmentList attachments={email.attachments} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
