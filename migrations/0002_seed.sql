-- Vallle · Seed data for local development
-- Run with: npx wrangler d1 execute vallle-db --file=./migrations/0002_seed.sql
--
-- ⚠️  LOCAL DEVELOPMENT ONLY — never run against the production database.
-- The shared password below is public; seeding it into prod would create
-- accounts anyone can log into.
--
-- All passwords are: "vallle123"
-- Pre-hashed with PBKDF2-SHA256 (100k iterations, legacy 2-part salt:hash
-- format — still accepted by verifyPassword's legacy fallback).
-- To regenerate, run the hash-password script (see below).

-- ─── Users ──────────────────────────────────────────────────────
-- Local dev super admin — for development only. The real production
-- super admin is created out-of-band (never committed); see the
-- "Production super admin" step in documentation.md. Both use the same
-- email but live in separate D1 databases, so they never collide.
INSERT OR IGNORE INTO users (id, name, email, password, role, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000001',
  'João Guerreiro',
  'joao@vallle.com',
  '8fe400ca058abd49e7de7c5eced93f2b:aea9e1836138724651be3535bf815ff622701a9e0bacd30707f4bd5836b8fd0f',
  'super_admin',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- Store owner: Café Flor
INSERT OR IGNORE INTO users (id, name, email, password, role, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000002',
  'Maria Santos',
  'maria@cafeflor.pt',
  '8fe400ca058abd49e7de7c5eced93f2b:aea9e1836138724651be3535bf815ff622701a9e0bacd30707f4bd5836b8fd0f',
  'user',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- Store owner: Padaria São Jorge
INSERT OR IGNORE INTO users (id, name, email, password, role, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000003',
  'António Ferreira',
  'antonio@padariasaojorge.pt',
  '8fe400ca058abd49e7de7c5eced93f2b:aea9e1836138724651be3535bf815ff622701a9e0bacd30707f4bd5836b8fd0f',
  'user',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- Store owner: Vinhos do Monte
INSERT OR IGNORE INTO users (id, name, email, password, role, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000004',
  'Ana Oliveira',
  'ana@vinhosdomonte.pt',
  '8fe400ca058abd49e7de7c5eced93f2b:aea9e1836138724651be3535bf815ff622701a9e0bacd30707f4bd5836b8fd0f',
  'user',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- ─── Stores ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO stores (id, name, slug, category, email, phone, address1, city, postal_code, region, country, default_min_redemption_mode, default_min_redemption_cents, plan, plan_renews_at, is_founding_member, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000010',
  'Café Flor',
  'cafe-flor',
  'cafe',
  'geral@cafeflor.pt',
  '+351 213 456 789',
  'Rua das Flores 42',
  'Lisboa',
  '1200-195',
  'Lisboa',
  'PT',
  'custom',
  1000,
  'growth',
  '2027-03-17T10:00:00Z',
  1,
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

INSERT OR IGNORE INTO stores (id, name, slug, category, email, phone, address1, city, postal_code, region, country, default_min_redemption_mode, default_min_redemption_cents, plan, plan_renews_at, is_founding_member, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000011',
  'Padaria São Jorge',
  'padaria-sao-jorge',
  'bakery',
  'geral@padariasaojorge.pt',
  '+351 222 345 678',
  'Travessa de Cedofeita 15',
  'Porto',
  '4050-180',
  'Porto',
  'PT',
  'full',
  0,
  'starter',
  '2027-03-17T10:00:00Z',
  0,
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

INSERT OR IGNORE INTO stores (id, name, slug, category, email, phone, address1, city, postal_code, region, country, plan, plan_renews_at, is_founding_member, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000012',
  'Vinhos do Monte',
  'vinhos-do-monte',
  'retail',
  'geral@vinhosdomonte.pt',
  '+351 266 789 012',
  'Largo da Praça 7',
  'Évora',
  '7000-651',
  'Alentejo',
  'PT',
  'starter',
  '2027-03-17T10:00:00Z',
  0,
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- ─── Store users (link owners to stores) ─────────────────────────
-- role + status are store-scoped: role is admin/user, status is active/inactive
-- (whether the user can access that store). "suspended" is a store-level state,
-- not a membership one.
INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, status, created_at)
VALUES ('01JA0000000000000000000020', '01JA0000000000000000000010', '01JA0000000000000000000002', 'admin', 'active', '2026-03-17T10:00:00Z');

INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, status, created_at)
VALUES ('01JA0000000000000000000021', '01JA0000000000000000000011', '01JA0000000000000000000003', 'admin', 'active', '2026-03-17T10:00:00Z');

INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, status, created_at)
VALUES ('01JA0000000000000000000022', '01JA0000000000000000000012', '01JA0000000000000000000004', 'admin', 'active', '2026-03-17T10:00:00Z');

-- Maria Santos also belongs to Padaria São Jorge — as a regular member, to
-- exercise the store-scoped role (admin at Café Flor, plain user here).
INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, status, created_at)
VALUES ('01JA0000000000000000000024', '01JA0000000000000000000011', '01JA0000000000000000000002', 'user', 'active', '2026-03-17T10:00:00Z');

-- ─── Vallles ───────────────────────────────────────────────────
-- Café Flor: active vallle, €25 (store policy: €10 minimum, snapshotted)
INSERT OR IGNORE INTO vallles (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, min_redemption_mode, min_redemption_cents, updated_at)
VALUES (
  '01JA0000000000000000000030',
  '01JA0000000000000000000010',
  '01JA0000000000000000000002',
  'CFRM7K',
  2500, 2500, 'Pedro Costa',
  'active',
  '2026-03-15T14:00:00Z',
  '2031-03-15T14:00:00Z',
  'custom',
  1000,
  '2026-03-15T14:00:00Z'
);

-- Café Flor: partially used vallle, €50 (€30 remaining; €10 minimum snapshotted)
INSERT OR IGNORE INTO vallles (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, min_redemption_mode, min_redemption_cents, updated_at)
VALUES (
  '01JA0000000000000000000031',
  '01JA0000000000000000000010',
  '01JA0000000000000000000002',
  'CFT4NQ',
  5000, 3000, 'Sofia Mendes',
  'active',
  '2026-03-10T11:00:00Z',
  '2031-03-10T11:00:00Z',
  'custom',
  1000,
  '2026-03-12T16:30:00Z'
);

-- Padaria São Jorge: active vallle, €15 (store policy: full value only, snapshotted)
INSERT OR IGNORE INTO vallles (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, min_redemption_mode, min_redemption_cents, updated_at)
VALUES (
  '01JA0000000000000000000032',
  '01JA0000000000000000000011',
  '01JA0000000000000000000003',
  'PSJR6H',
  1500, 1500, 'Tiago Almeida',
  'active',
  '2026-03-16T09:00:00Z',
  '2031-03-16T09:00:00Z',
  'full',
  0,
  '2026-03-16T09:00:00Z'
);

-- Vinhos do Monte: fully used vallle, €40
INSERT OR IGNORE INTO vallles (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
VALUES (
  '01JA0000000000000000000033',
  '01JA0000000000000000000012',
  '01JA0000000000000000000004',
  'VDMB5G',
  4000, 0, 'Beatriz Nunes',
  'used',
  '2026-03-01T15:00:00Z',
  '2031-03-01T15:00:00Z',
  '2026-03-14T18:00:00Z'
);

-- ─── Redemptions ────────────────────────────────────────────────
-- Café Flor: partial redemption on the €50 vallle (€20 coffee + pastry)
INSERT OR IGNORE INTO redemptions (id, store_id, vallle_id, redeemed_by, description, amount, balance_after, created_at)
VALUES (
  '01JA0000000000000000000040',
  '01JA0000000000000000000010',
  '01JA0000000000000000000031',
  '01JA0000000000000000000002',
  'Café e pastel de nata',
  2000, 3000,
  '2026-03-12T16:30:00Z'
);

-- Vinhos do Monte: full redemption on the €40 vallle
INSERT OR IGNORE INTO redemptions (id, store_id, vallle_id, redeemed_by, description, amount, balance_after, created_at)
VALUES (
  '01JA0000000000000000000041',
  '01JA0000000000000000000012',
  '01JA0000000000000000000033',
  '01JA0000000000000000000004',
  'Garrafa de vinho Alentejano',
  4000, 0,
  '2026-03-14T18:00:00Z'
);

-- ─── Subscription periods ───────────────────────────────────────
-- Flat annual fee per store, tiered by vallles sold/year. amount is net cents
-- (monthly × 12); 0 for a founding-member's free first year. paid_at NULL = due.

-- Café Flor: Growth plan, founding member → first year free (paid, €0)
INSERT OR IGNORE INTO subscription_periods (id, store_id, plan, period_start, period_end, amount, vallles_sold, paid_at, created_at)
VALUES (
  '01JA0000000000000000000050',
  '01JA0000000000000000000010',
  'growth',
  '2026-03-17T10:00:00Z',
  '2027-03-17T10:00:00Z',
  0, 2,
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- Padaria São Jorge: Starter plan, first year billed, unpaid (€59.88 net)
INSERT OR IGNORE INTO subscription_periods (id, store_id, plan, period_start, period_end, amount, vallles_sold, paid_at, created_at)
VALUES (
  '01JA0000000000000000000051',
  '01JA0000000000000000000011',
  'starter',
  '2026-03-17T10:00:00Z',
  '2027-03-17T10:00:00Z',
  5988, 1,
  NULL,
  '2026-03-17T10:00:00Z'
);

-- Vinhos do Monte: Starter plan, paid (€59.88 net)
INSERT OR IGNORE INTO subscription_periods (id, store_id, plan, period_start, period_end, amount, vallles_sold, paid_at, created_at)
VALUES (
  '01JA0000000000000000000052',
  '01JA0000000000000000000012',
  'starter',
  '2026-03-17T10:00:00Z',
  '2027-03-17T10:00:00Z',
  5988, 1,
  '2026-04-01T10:00:00Z',
  '2026-03-17T10:00:00Z'
);
