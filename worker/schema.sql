-- ============================================================
-- USERS: Registered user accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    phone           TEXT UNIQUE,
    phone_verified  INTEGER NOT NULL DEFAULT 0,
    display_name    TEXT,
    avatar_url      TEXT,
    created_at      INTEGER NOT NULL,
    last_login_at   INTEGER NOT NULL
);

-- ============================================================
-- ACCOUNTS: Linked OAuth provider accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL,
    provider          TEXT NOT NULL,
    provider_user_id  TEXT NOT NULL,
    provider_email    TEXT,
    provider_name     TEXT,
    provider_avatar   TEXT,
    linked_at         INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ============================================================
-- SESSIONS: Browser sessions (anonymous or authenticated)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT,
    created_at      INTEGER NOT NULL,
    last_active_at  INTEGER NOT NULL,
    user_agent      TEXT,
    ip_hash         TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============================================================
-- EMAIL ADDRESSES: Email addresses created by users/sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS email_addresses (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL,
    user_id         TEXT,
    local_part      TEXT NOT NULL,
    full_address    TEXT NOT NULL UNIQUE,
    created_at      INTEGER NOT NULL,
    expires_at      INTEGER NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_addresses_session ON email_addresses(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON email_addresses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_addresses_full ON email_addresses(full_address);

-- ============================================================
-- EMAILS: Received and sent emails (full email system)
-- ============================================================
CREATE TABLE IF NOT EXISTS emails (
    id              TEXT PRIMARY KEY,
    address_id      TEXT NOT NULL,
    from_address    TEXT NOT NULL,
    from_name       TEXT,
    to_address      TEXT NOT NULL,
    cc              TEXT,
    bcc             TEXT,
    subject         TEXT,
    body_text       TEXT,
    body_html       TEXT,
    is_read         INTEGER NOT NULL DEFAULT 0,
    folder          TEXT NOT NULL DEFAULT 'inbox',
    in_reply_to     TEXT,
    is_starred      INTEGER NOT NULL DEFAULT 0,
    received_at     INTEGER NOT NULL,
    expires_at      INTEGER NOT NULL,
    size_bytes      INTEGER,
    has_attachments INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (address_id) REFERENCES email_addresses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_emails_address ON emails(address_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(address_id, folder, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_expires ON emails(expires_at);
CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at);

-- ============================================================
-- ATTACHMENTS: Files attached to emails
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
    id              TEXT PRIMARY KEY,
    email_id        TEXT NOT NULL,
    filename        TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL,
    content_base64  TEXT,
    storage_ref     TEXT,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attachments_email ON attachments(email_id);

-- ============================================================
-- VERIFICATION_CODES: SMS OTP codes
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_codes (
    id          TEXT PRIMARY KEY,
    phone       TEXT NOT NULL,
    code        TEXT NOT NULL,
    purpose     TEXT NOT NULL DEFAULT 'login',
    expires_at  INTEGER NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vcodes_phone ON verification_codes(phone, purpose, used, expires_at);

-- ============================================================
-- REFRESH_TOKENS: JWT refresh token rotation
-- ============================================================
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

-- ============================================================
-- SYSTEM: Configuration key-value store
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      INTEGER NOT NULL
);

INSERT OR IGNORE INTO config (key, value, updated_at) VALUES
    ('email_ttl_minutes', '10', unixepoch()),
    ('address_ttl_hours', '24', unixepoch()),
    ('max_addresses_per_session', '5', unixepoch()),
    ('max_attachment_size_bytes', '524288', unixepoch()),
    ('sending_enabled', 'true', unixepoch()),
    ('sms_enabled', 'true', unixepoch()),
    ('jwt_access_ttl_seconds', '900', unixepoch()),
    ('jwt_refresh_ttl_seconds', '2592000', unixepoch()),
    ('oauth_github_enabled', 'true', unixepoch()),
    ('oauth_google_enabled', 'true', unixepoch());
