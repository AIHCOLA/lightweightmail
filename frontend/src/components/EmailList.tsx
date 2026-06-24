import type { EmailListItem as EmailListItemType, Email } from '../types';
import { EmailListItem } from './EmailListItem';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';

interface EmailListProps {
  emails: EmailListItemType[];
  isLoading: boolean;
  selectedEmail: Email | null;
  onSelectEmail: (emailId: string) => void;
}

export function EmailList({ emails, isLoading, selectedEmail, onSelectEmail }: EmailListProps) {
  if (isLoading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isLoading && emails.length === 0) {
    return <EmptyState type="no-emails" />;
  }

  return (
    <div className="space-y-1.5 p-4">
      {isLoading && emails.length > 0 && (
        <div className="flex items-center justify-center py-2">
          <Spinner size="sm" />
        </div>
      )}
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          isSelected={selectedEmail?.id === email.id}
          onClick={() => onSelectEmail(email.id)}
        />
      ))}
    </div>
  );
}
