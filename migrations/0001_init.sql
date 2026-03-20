-- Vallle · D1 schema v6
-- Run with: wrangler d1 execute vallle-db --remote --file=./0001_init.sql
-- All monetary INTEGER columns store cents (e.g. 5000 = €50.00)

-- ─── Users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'admin',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Stores ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  vat_id      TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  address1    TEXT NOT NULL DEFAULT '',
  address2    TEXT NOT NULL DEFAULT '',
  city        TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  region      TEXT NOT NULL DEFAULT '',
  country     TEXT NOT NULL DEFAULT 'PT',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Store users (many-to-many) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS store_users (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  role       TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_users_unique ON store_users(store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON store_users(user_id);

-- ─── Vouchers ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouchers (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  code       TEXT NOT NULL UNIQUE,
  amount     INTEGER NOT NULL,
  balance    INTEGER NOT NULL,
  buyer      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_vouchers_store  ON vouchers(store_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- ─── Redemptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS redemptions (
  id            TEXT PRIMARY KEY,
  store_id      TEXT NOT NULL REFERENCES stores(id),
  voucher_id    TEXT NOT NULL REFERENCES vouchers(id),
  redeemed_by   TEXT NOT NULL REFERENCES users(id),
  description   TEXT NOT NULL DEFAULT '',
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_redemptions_store   ON redemptions(store_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_voucher ON redemptions(voucher_id);

-- ─── Commissions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id),
  voucher_id TEXT NOT NULL REFERENCES vouchers(id),
  amount     INTEGER NOT NULL,
  paid_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_commissions_store  ON commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_commissions_unpaid ON commissions(store_id) WHERE paid_at IS NULL;

-- ─── Password reset tokens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
