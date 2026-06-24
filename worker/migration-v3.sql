-- Migration v3: User accounts + OAuth + phone verification
-- Safe to run on existing database (all new tables/columns, no destructive changes)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    phone           TEXT UNIQUE,
    phone_verified  INTEGER NOT NULL DEFAULT 0,
    display_name    TEXT,
    avatar_url      TEXT,
    created_at      INTEGER NOT NULL,
    last_login_at   INTEGER NOT NULL
);

-- OAuth-linked accounts (many-to-one with users)
CREATE TABLE IF NOT EXISTS accounts (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL,
    provider          TEXT NOT NULL,        -- 'github' | 'google'
    provider_user_id  TEXT NOT NULL,
    provider_email    TEXT,
    provider_name     TEXT,
    provider_avatar   TEXT,
    linked_at         INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- SMS verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
    id          TEXT PRIMARY KEY,
    phone       TEXT NOT NULL,
    code        TEXT NOT NULL,
    purpose     TEXT NOT NULL DEFAULT 'login',   -- 'login' | 'link'
    expires_at  INTEGER NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vcodes_phone ON verification_codes(phone, purpose, used, expires_at);

-- JWT refresh tokens (with family rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    token_hash  TEXT NOT NULL UNIQUE,
    family      TEXT NOT NULL,
    expires_at  INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    revoked     INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id, revoked);

-- Add user_id to existing tables (NULL = anonymous/guest)
ALTER TABLE email_addresses ADD COLUMN user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON email_addresses(user_id, is_active);

ALTER TABLE sessions ADD COLUMN user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- New config entries
INSERT OR IGNORE INTO config (key, value, updated_at) VALUES
    ('sms_enabled', 'true', unixepoch()),
    ('jwt_access_ttl_seconds', '900', unixepoch()),
    ('jwt_refresh_ttl_seconds', '2592000', unixepoch()),
    ('oauth_github_enabled', 'true', unixepoch()),
    ('oauth_google_enabled', 'true', unixepoch());
