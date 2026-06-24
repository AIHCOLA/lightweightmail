export interface Session {
  id: string;
  created_at: number;
  last_active_at: number;
}

export interface EmailAddress {
  id: string;
  session_id: string;
  user_id?: string | null;
  local_part: string;
  full_address: string;
  created_at: number;
  expires_at: number;
  is_active: number;
  unread_count?: number;
}

export interface Attachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface Email {
  id: string;
  address_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  cc: string | null;
  bcc: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  is_read: number;
  folder: string;
  in_reply_to: string | null;
  is_starred: number;
  received_at: number;
  expires_at: number;
  size_bytes: number | null;
  has_attachments: number;
  attachments?: Attachment[];
}

export interface EmailListItem {
  id: string;
  address_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  cc: string | null;
  subject: string | null;
  body_text_preview: string | null;
  is_read: number;
  folder: string;
  in_reply_to: string | null;
  is_starred: number;
  received_at: number;
  expires_at: number;
  size_bytes: number | null;
  has_attachments: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    count: number;
    folder: string;
    since: number | null;
    fetched_at: number;
    message?: string;
  };
}

export interface AppConfig {
  email_ttl_minutes: number;
  address_ttl_hours: number;
  max_addresses_per_session: number;
  max_attachment_size_bytes: number;
  polling_interval_ms: number;
  sms_enabled?: boolean;
  oauth_github_enabled?: boolean;
  oauth_google_enabled?: boolean;
}

export type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash';

export interface SendEmailParams {
  address_id: string;
  session_id?: string;
  user_id?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text: string;
  body_html?: string;
  in_reply_to?: string;
  is_draft?: boolean;
}
