export type Lang = 'zh' | 'en';

export interface Translations {
  // App
  app_title: string;
  app_subtitle: string;

  // Header
  new_address: string;
  switch_to_english: string;
  switch_to_chinese: string;
  switch_to_light_mode: string;
  switch_to_dark_mode: string;

  // Folders
  inbox: string;
  sent: string;
  drafts: string;
  trash: string;
  compose: string;
  sent_from: string;

  // Address Generator
  generate_address: string;
  random_address: string;
  random_address_desc: string;
  custom_address: string;
  custom_address_desc: string;
  custom_address_placeholder: string;
  or_divider: string;
  create: string;
  address_chars_hint: string;
  address_validation_min: string;
  address_validation_chars: string;
  address_validation_start_end: string;

  // Sidebar
  email_addresses: string;

  // Address Card
  copied: string;
  delete_address: string;
  address_deleted: string;
  address_created: string;
  copy_failed: string;
  expired: string;

  // Email List
  inbox_for: string;
  waiting_for_emails: string;
  waiting_for_emails_desc: string;
  no_addresses: string;
  no_addresses_desc: string;
  no_subject: string;

  // Email Detail
  email_detail: string;
  delete: string;
  from_label: string;
  to_label: string;
  cc_label: string;
  date_label: string;
  size_label: string;
  no_content: string;
  star: string;
  reply: string;
  reply_all: string;
  forward: string;
  restore: string;

  // Compose
  new_message: string;
  add_cc: string;
  add_bcc: string;
  bcc_label: string;
  subject_label: string;
  send: string;
  save_draft: string;
  discard: string;
  recipient_placeholder: string;
  cc_placeholder: string;
  bcc_placeholder: string;
  subject_placeholder: string;
  message_placeholder: string;
  validation_fill_fields: string;
  draft_saved: string;
  email_sent: string;
  failed_to_send: string;
  original_message_divider: string;
  no_subject_fallback: string;

  // Email Body
  email_content: string;

  // Attachments
  attachments: string;

  // Countdown
  just_now: string;
  min_ago: string;
  mins_ago: string;
  hour_ago: string;
  hours_ago: string;
  day_ago: string;
  days_ago: string;

  // General
  select_or_create: string;
  loading: string;
  retry: string;
  close: string;
  download: string;
  copy: string;
  confirm: string;
  cancel: string;

  // Auth / Login
  login_title: string;
  phone_login: string;
  github_login: string;
  google_login: string;
  phone_number: string;
  send_code: string;
  resend_code: string;
  verify_code: string;
  login_button: string;
  continue_as_guest: string;
  code_sent: string;
  invalid_phone: string;
  code_expired: string;
  too_many_attempts: string;
  linking: string;
  oauth_failed: string;
  // Profile
  profile: string;
  linked_accounts: string;
  active_sessions: string;
  link_account: string;
  unlink_account: string;
  delete_account: string;
  sign_out: string;
  phone_not_verified: string;

  // Toast
  toast_copied: string;
  toast_address_created: string;
  toast_address_deleted: string;
  toast_email_deleted: string;
  toast_copy_failed: string;
  toast_error: string;
}
