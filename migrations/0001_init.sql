-- Vallle · D1 schema v10
-- Run with: wrangler d1 execute vallle-db --remote --file=./0001_init.sql
-- All monetary INTEGER columns store cents (e.g. 5000 = €50.00)

-- ─── Users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  -- Account scope: platform flag only. 'super_admin' (sysadmin) or plain 'user'.
  -- The admin/user distinction is store-scoped (see store_users.role).
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar     TEXT NOT NULL DEFAULT 'paper-bag-head',
  locale     TEXT NOT NULL DEFAULT 'pt',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Stores ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id                         TEXT PRIMARY KEY,
  name                       TEXT NOT NULL,
  slug                       TEXT NOT NULL UNIQUE,
  category                   TEXT NOT NULL DEFAULT '',
  email                      TEXT NOT NULL DEFAULT '',
  vat_id                     TEXT NOT NULL DEFAULT '',
  phone                      TEXT NOT NULL DEFAULT '',
  address1                   TEXT NOT NULL DEFAULT '',
  address2                   TEXT NOT NULL DEFAULT '',
  city                       TEXT NOT NULL DEFAULT '',
  postal_code                TEXT NOT NULL DEFAULT '',
  region                     TEXT NOT NULL DEFAULT '',
  country                    TEXT NOT NULL DEFAULT 'PT',
  -- Store-level state, set by the super_admin: 'suspended' = read-only (no new
  -- vallles), 'inactive' = no access. Distinct from a membership's status.
  status                     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  default_vallle_expiry_days INTEGER NOT NULL DEFAULT 365,
  -- Minimum redemption policy (advisory, surfaced as a warn-and-confirm in the
  -- app, never a hard block). 'none' = any amount, 'full' = whole remaining
  -- balance at once, 'custom' = at least default_min_redemption_cents. The cents
  -- column is only meaningful when the mode is 'custom'.
  default_min_redemption_mode  TEXT    NOT NULL DEFAULT 'none' CHECK (default_min_redemption_mode IN ('none', 'full', 'custom')),
  default_min_redemption_cents INTEGER NOT NULL DEFAULT 0,
  -- Subscription plan (flat annual fee, tiered by vallles sold/year). The tier
  -- is set at renewal from the trailing-year count, never auto-bumped mid-year.
  -- 'custom' = bespoke (1000+/yr). plan_renews_at is the next renewal date.
  -- is_founding_member flags early adopters (first year free).
  plan                       TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro', 'custom')),
  plan_renews_at             TEXT,
  is_founding_member         INTEGER NOT NULL DEFAULT 0,
  created_at                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Store users (many-to-many) ─────────────────────────────────
-- role/status are store-scoped: a user can be an admin in one store and a
-- plain (or inactive) member in another. status is active/inactive only —
-- whether the user can access that store. "suspended" is a store-level state
-- (stores.status), not a membership one. users.role/users.status remain
-- account-level (super_admin platform flag + account kill-switch).
CREATE TABLE IF NOT EXISTS store_users (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  -- Store scope: what the user can do within this store. 'admin' manages the
  -- store and its members; 'user' is store staff.
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('user', 'admin')),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_users_unique ON store_users(store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON store_users(user_id);

-- ─── Vallles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vallles (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  code       TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  balance    INTEGER NOT NULL,
  buyer      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at TEXT NOT NULL,
  -- Minimum redemption policy, snapshotted from the store's defaults at creation
  -- (mirrors expires_at). See stores.default_min_redemption_mode for semantics.
  min_redemption_mode  TEXT    NOT NULL DEFAULT 'none' CHECK (min_redemption_mode IN ('none', 'full', 'custom')),
  min_redemption_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- Codes are unique per store, not globally: short codes only need to be
  -- unambiguous within the store that issued them.
  UNIQUE (store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_vallles_store  ON vallles(store_id);
CREATE INDEX IF NOT EXISTS idx_vallles_status ON vallles(status);

-- ─── Redemptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS redemptions (
  id            TEXT PRIMARY KEY,
  store_id      TEXT NOT NULL REFERENCES stores(id),
  vallle_id    TEXT NOT NULL REFERENCES vallles(id),
  redeemed_by   TEXT NOT NULL REFERENCES users(id),
  description   TEXT NOT NULL DEFAULT '',
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_redemptions_store   ON redemptions(store_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_vallle ON redemptions(vallle_id);

-- ─── Subscription periods ───────────────────────────────────────
-- One row per store per billing year: the annual subscription charge, with
-- paid_at tracking (mirrors the old manual "mark as paid" flow). The period
-- history doubles as the subscription log: created_at = when the renewal was
-- recorded, paid_at = when it was paid, period_start/end = what it covers,
-- notes = free-form context ("paid by transfer", discounts, ...). vallles_sold
-- snapshots the count that set the tier for the period; amount is the net
-- (ex-VAT) annual price in cents (0 for a founding-member's free first year).
CREATE TABLE IF NOT EXISTS subscription_periods (
  id           TEXT PRIMARY KEY,
  store_id     TEXT NOT NULL REFERENCES stores(id),
  plan         TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'pro', 'custom')),
  period_start TEXT NOT NULL,
  period_end   TEXT NOT NULL,
  amount       INTEGER NOT NULL,
  vallles_sold INTEGER NOT NULL DEFAULT 0,
  paid_at      TEXT,
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_periods_store  ON subscription_periods(store_id);
CREATE INDEX IF NOT EXISTS idx_subscription_periods_unpaid ON subscription_periods(store_id) WHERE paid_at IS NULL;

-- ─── Orders ─────────────────────────────────────────────────────
-- Physical fulfilment orders: the welcome pack at signup and later refills
-- (cards, envelopes, ...). Stores currently request these by email/phone and
-- the super_admin records them; the table is store-scoped so a client-facing
-- ordering flow can reuse it later. amount is the net one-off price in cents
-- (0 = included, e.g. the welcome pack). Payment record: invoiced_at (when
-- the invoice was sent) + paid_at (mirrors subscription_periods) — the
-- payment state is derived: no invoiced_at = still to invoice, invoiced_at
-- only = awaiting payment, paid_at = settled.
CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY,
  store_id     TEXT NOT NULL REFERENCES stores(id),
  type         TEXT NOT NULL DEFAULT 'refill' CHECK (type IN ('welcome_pack', 'refill')),
  status       TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'preparing', 'shipped', 'delivered', 'cancelled')),
  amount       INTEGER NOT NULL DEFAULT 0,
  invoiced_at  TEXT,
  paid_at      TEXT,
  notes        TEXT NOT NULL DEFAULT '',
  -- When the store asked for it (orders arrive by email/phone and may be
  -- recorded later, so this is editable and distinct from created_at).
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- Payment is sequential: an order can't be paid before it was invoiced.
  -- Enforced here so any future writer inherits the rule (the API also
  -- guards it with friendly 4xx errors).
  CHECK (paid_at IS NULL OR invoiced_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_orders_store  ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ─── Order items ────────────────────────────────────────────────
-- What's inside an order. item is validated in app code against the catalogue
-- (cards, envelopes, box, pen) so adding a product doesn't need a migration.
CREATE TABLE IF NOT EXISTS order_items (
  id       TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item     TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

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

-- ─── Auth rate limits ───────────────────────────────────────────
-- Fixed-window counters for the unauthenticated auth endpoints (login, forgot-
-- password, reset-password), keyed by "<endpoint>:<client-ip>". Written on every
-- attempt; a bucket's window resets once window_start falls outside the endpoint's
-- window. Backs the brute-force / abuse throttle in functions/api/_rate-limit.js.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket       TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start TEXT NOT NULL
);
