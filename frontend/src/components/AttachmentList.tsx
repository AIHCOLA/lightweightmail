import { Download, File } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Attachment } from '../types';
import { getAttachmentDownloadUrl } from '../api/client';
import { formatBytes } from '../utils/format';

interface AttachmentListProps {
  attachments: Attachment[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  const { t } = useI18n();

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        {t.attachments} ({attachments.length})
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((att) => (
          <a
            key={att.id}
            href={getAttachmentDownloadUrl(att.id)}
            download={att.filename}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center shrink-0">
              <File size={18} className="text-primary-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {att.filename}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatBytes(att.size_bytes)}
              </p>
            </div>
            <Download
              size={16}
              className="text-gray-400 dark:text-gray-500 group-hover:text-primary-500 transition-colors shrink-0"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
