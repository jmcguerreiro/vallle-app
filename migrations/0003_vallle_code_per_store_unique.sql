-- Make vallle codes unique per store instead of globally.
--
-- SQLite can't drop a column-level UNIQUE constraint in place, so we rebuild
-- the table with a composite UNIQUE(store_id, code). Row ids are preserved, so
-- foreign keys from redemptions/commissions stay valid. Safe to run once on an
-- already-provisioned database; fresh databases get the constraint from 0001.

PRAGMA foreign_keys = OFF;

CREATE TABLE vallles_new (
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
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (store_id, code)
);

INSERT INTO vallles_new (
  id, store_id, created_by, code, amount, balance, buyer, status,
  created_at, expires_at, updated_at
)
SELECT
  id, store_id, created_by, code, amount, balance, buyer, status,
  created_at, expires_at, updated_at
FROM vallles;

DROP TABLE vallles;
ALTER TABLE vallles_new RENAME TO vallles;

CREATE INDEX IF NOT EXISTS idx_vallles_store  ON vallles(store_id);
CREATE INDEX IF NOT EXISTS idx_vallles_status ON vallles(status);

PRAGMA foreign_keys = ON;
