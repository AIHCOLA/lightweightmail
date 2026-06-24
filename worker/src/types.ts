// Environment bindings for Cloudflare Worker
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  DOMAIN: string;
  DEFAULT_EMAIL_TTL_MINUTES: string;
  DEFAULT_ADDRESS_TTL_HOURS: string;
  MAX_ADDRESSES_PER_SESSION: string;
  MAX_ATTACHMENT_SIZE_BYTES: string;
  CLEANUP_SECRET: string;
  SEND_KEY?: string;
  // Auth secrets (set via wrangler secret put)
  JWT_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  CSRF_SECRET?: string;
}

// ==================== Auth Types ====================

export interface User {
  id: string;
  phone: string | null;
  phone_verified: number;
  display_name: string | null;
  avatar_url: string | null;
  created_at: number;
  last_login_at: number;
}

export interface Account {
  id: string;
  user_id: string;
  provider: 'github' | 'google';
  provider_user_id: string;
  provider_email: string | null;
  provider_name: string | null;
  provider_avatar: string | null;
  linked_at: number;
}

export interface JwtPayload {
  sub: string;            // user_id
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
  phone_verified: number;
}

export interface AuthContext {
  user_id: string;
  phone_verified: number;
}

// ==================== Domain Types ====================

// Session
export interface Session {
  id: string;
  user_id?: string | null;
  created_at: number;
  last_active_at: number;
}

// Email Address
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

// Email
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

// Attachment
export interface Attachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  content_base64: string | null;
  storage_ref: string | null;
  created_at: number;
}

// Email list item (without full body for list queries)
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

// Compose/send request
export interface SendEmailRequest {
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
