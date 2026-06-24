-- Migration v2: Upgrade to full email system
-- Run: wrangler d1 execute temp-mail-db --file=migration-v2.sql

-- Add folder column to emails (inbox, sent, drafts, trash)
ALTER TABLE emails ADD COLUMN folder TEXT NOT NULL DEFAULT 'inbox';

-- Add CC, BCC fields
ALTER TABLE emails ADD COLUMN cc TEXT;
ALTER TABLE emails ADD COLUMN bcc TEXT;

-- Add reply tracking
ALTER TABLE emails ADD COLUMN in_reply_to TEXT;

-- Add star/flag
ALTER TABLE emails ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0;

-- Update index for folder queries
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(address_id, folder, received_at DESC);

-- Add config entries for new features
INSERT OR IGNORE INTO config (key, value, updated_at) VALUES ('sending_enabled', 'true', unixepoch());
