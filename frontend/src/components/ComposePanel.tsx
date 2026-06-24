import { useState } from 'react';
import { X, Send, Save } from 'lucide-react';
import { useI18n } from '../i18n';
import { useToast } from './Toast';
import { Spinner } from './Spinner';
import type { Email, EmailAddress } from '../types';
import * as api from '../api/client';

interface ComposePanelProps {
  mode: 'compose' | 'reply' | 'reply-all' | 'forward';
  originalEmail?: Email | null;
  address: EmailAddress;
  sessionId: string | null;
  onClose: () => void;
  onSent: () => void;
}

export function ComposePanel({ mode, originalEmail, address, sessionId, onClose, onSent }: ComposePanelProps) {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [to, setTo] = useState(() => {
    if (mode === 'reply') return originalEmail?.from_address ?? '';
    if (mode === 'reply-all') {
      const all = [originalEmail?.from_address ?? ''];
      if (originalEmail?.cc) all.push(...originalEmail.cc.split(',').map(s => s.trim()));
      return all.filter(Boolean).join(', ');
    }
    return '';
  });
  const [cc, setCc] = useState(() => mode === 'reply-all' ? '' : '');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(() => {
    if (mode === 'reply' || mode === 'reply-all') return `Re: ${originalEmail?.subject ?? ''}`;
    if (mode === 'forward') return `Fwd: ${originalEmail?.subject ?? ''}`;
    return '';
  });
  const [bodyText, setBodyText] = useState(() => {
    if (!originalEmail) return '';
    const dateStr = new Date(originalEmail.received_at * 1000).toLocaleString();
    const fromStr = originalEmail.from_name
      ? `${originalEmail.from_name} <${originalEmail.from_address}>`
      : originalEmail.from_address;
    const quote = `\n\n${t.original_message_divider}\n${t.from_label}: ${fromStr}\n${t.date_label}: ${dateStr}\n${t.subject_label}: ${originalEmail.subject}\n\n${originalEmail.body_text ?? ''}`;
    return mode === 'compose' ? '' : quote;
  });
  const [showCc, setShowCc] = useState(!!cc);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const title = mode === 'compose' ? t.new_message
    : mode === 'reply' ? t.reply
    : mode === 'reply-all' ? t.reply_all
    : t.forward;

  const handleSend = async (isDraft = false) => {
    const toList = to.split(',').map(s => s.trim()).filter(Boolean);
    if (!isDraft && (!toList.length || !subject.trim() || !bodyText.trim())) {
      addToast('error', t.validation_fill_fields);
      return;
    }

    setIsSending(true);
    const result = await api.sendEmail({
      address_id: address.id,
      session_id: sessionId ?? undefined,
      to: toList,
      cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      bcc: bcc ? bcc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      subject: subject.trim() || t.no_subject_fallback,
      body_text: bodyText,
      body_html: undefined,
      in_reply_to: (mode === 'reply' || mode === 'reply-all') ? originalEmail?.id : undefined,
      is_draft: isDraft,
    });

    if (result.success) {
      addToast('success', isDraft ? t.draft_saved : t.email_sent);
      onSent();
      onClose();
    } else {
      addToast('error', result.error ?? t.failed_to_send);
    }
    setIsSending(false);
  };

  const fieldLabel = (label: string) => (
    <span className="text-gray-500 dark:text-gray-400 w-14 shrink-0 text-sm pt-2.5 text-right">{label}</span>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-8 lg:inset-x-12 lg:inset-y-8 z-[60] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg" aria-label={t.close}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-3">
          {/* From */}
          <div className="flex items-center gap-2 text-sm">
            {fieldLabel(`${t.from_label}:`)}
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{address.full_address}</span>
          </div>

          {/* To */}
          <div className="flex items-start gap-2">
            {fieldLabel(`${t.to_label}:`)}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder={t.recipient_placeholder}
                className="input w-full"
              />
            </div>
            <div className="flex gap-0.5 pt-0.5 shrink-0">
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="btn-ghost text-[11px] px-1.5 py-1 text-gray-500 hover:text-gray-700" title={t.add_cc}>
                  CC
                </button>
              )}
              {!showBcc && (
                <button onClick={() => setShowBcc(true)} className="btn-ghost text-[11px] px-1.5 py-1 text-gray-500 hover:text-gray-700" title={t.add_bcc}>
                  BCC
                </button>
              )}
            </div>
          </div>

          {/* CC */}
          {showCc && (
            <div className="flex items-start gap-2">
              {fieldLabel(`${t.cc_label}:`)}
              <div className="flex-1 min-w-0">
                <input type="text" value={cc} onChange={e => setCc(e.target.value)} placeholder={t.cc_placeholder} className="input w-full" />
              </div>
              <button onClick={() => { setShowCc(false); setCc(''); }} className="btn-ghost p-1.5 shrink-0 mt-0.5" aria-label={t.close}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="flex items-start gap-2">
              {fieldLabel(`${t.bcc_label}:`)}
              <div className="flex-1 min-w-0">
                <input type="text" value={bcc} onChange={e => setBcc(e.target.value)} placeholder={t.bcc_placeholder} className="input w-full" />
              </div>
              <button onClick={() => { setShowBcc(false); setBcc(''); }} className="btn-ghost p-1.5 shrink-0 mt-0.5" aria-label={t.close}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            {fieldLabel(`${t.subject_label}:`)}
            <div className="flex-1 min-w-0">
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder={t.subject_placeholder} className="input w-full" />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1">
            <textarea
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              placeholder={t.message_placeholder}
              className="input w-full min-h-[200px] resize-y font-sans"
              rows={10}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0 gap-2 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => handleSend(false)}
              disabled={isSending}
              className="btn-primary gap-2 text-sm"
            >
              {isSending ? <Spinner size="sm" /> : <Send size={16} />}
              {t.send}
            </button>
            <button
              onClick={() => handleSend(true)}
              disabled={isSending}
              className="btn-secondary gap-2 text-sm"
            >
              <Save size={16} />
              {t.save_draft}
            </button>
          </div>
          <button onClick={onClose} className="btn-ghost text-sm text-gray-500 hover:text-gray-700">
            {t.discard}
          </button>
        </div>
      </div>
    </>
  );
}
