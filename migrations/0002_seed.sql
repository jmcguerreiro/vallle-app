-- Vallle · Seed data for local development
-- Run with: npx wrangler d1 execute vallle-db --file=./migrations/0002_seed.sql
--
-- All passwords are: "vallle123"
-- Pre-hashed with PBKDF2-SHA256 (100k iterations).
-- To regenerate, run the hash-password script (see below).

-- ─── Users ──────────────────────────────────────────────────────
-- Super admin (you)
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
  'admin',
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
  'admin',
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
  'admin',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- ─── Stores ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO stores (id, name, slug, category, email, phone, address1, city, postal_code, region, country, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000010',
  'Café Flor',
  'cafe-flor',
  'café',
  'geral@cafeflor.pt',
  '+351 213 456 789',
  'Rua das Flores 42',
  'Lisboa',
  '1200-195',
  'Lisboa',
  'PT',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

INSERT OR IGNORE INTO stores (id, name, slug, category, email, phone, address1, city, postal_code, region, country, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000011',
  'Padaria São Jorge',
  'padaria-sao-jorge',
  'padaria',
  'geral@padariasaojorge.pt',
  '+351 222 345 678',
  'Travessa de Cedofeita 15',
  'Porto',
  '4050-180',
  'Porto',
  'PT',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

INSERT OR IGNORE INTO stores (id, name, slug, category, email, phone, address1, city, postal_code, region, country, status, created_at, updated_at)
VALUES (
  '01JA0000000000000000000012',
  'Vinhos do Monte',
  'vinhos-do-monte',
  'garrafeira',
  'geral@vinhosdomonte.pt',
  '+351 266 789 012',
  'Largo da Praça 7',
  'Évora',
  '7000-651',
  'Alentejo',
  'PT',
  'active',
  '2026-03-17T10:00:00Z',
  '2026-03-17T10:00:00Z'
);

-- ─── Store users (link owners to stores) ─────────────────────────
INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, created_at)
VALUES ('01JA0000000000000000000020', '01JA0000000000000000000010', '01JA0000000000000000000002', 'admin', '2026-03-17T10:00:00Z');

INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, created_at)
VALUES ('01JA0000000000000000000021', '01JA0000000000000000000011', '01JA0000000000000000000003', 'admin', '2026-03-17T10:00:00Z');

INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, created_at)
VALUES ('01JA0000000000000000000022', '01JA0000000000000000000012', '01JA0000000000000000000004', 'admin', '2026-03-17T10:00:00Z');

-- Super admin can also manage Café Flor (for testing)
INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, created_at)
VALUES ('01JA0000000000000000000023', '01JA0000000000000000000010', '01JA0000000000000000000001', 'admin', '2026-03-17T10:00:00Z');

-- Maria Santos also manages Padaria São Jorge (for testing multi-store)
INSERT OR IGNORE INTO store_users (id, store_id, user_id, role, created_at)
VALUES ('01JA0000000000000000000024', '01JA0000000000000000000011', '01JA0000000000000000000002', 'admin', '2026-03-17T10:00:00Z');

-- ─── Vouchers ───────────────────────────────────────────────────
-- Café Flor: active voucher, €25
INSERT OR IGNORE INTO vouchers (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
VALUES (
  '01JA0000000000000000000030',
  '01JA0000000000000000000010',
  '01JA0000000000000000000002',
  'CFR-M7K-X2P',
  2500, 2500, 'Pedro Costa',
  'active',
  '2026-03-15T14:00:00Z',
  '2031-03-15T14:00:00Z',
  '2026-03-15T14:00:00Z'
);

-- Café Flor: partially used voucher, €50 (€30 remaining)
INSERT OR IGNORE INTO vouchers (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
VALUES (
  '01JA0000000000000000000031',
  '01JA0000000000000000000010',
  '01JA0000000000000000000002',
  'CFR-T4N-W8Q',
  5000, 3000, 'Sofia Mendes',
  'active',
  '2026-03-10T11:00:00Z',
  '2031-03-10T11:00:00Z',
  '2026-03-12T16:30:00Z'
);

-- Padaria São Jorge: active voucher, €15
INSERT OR IGNORE INTO vouchers (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
VALUES (
  '01JA0000000000000000000032',
  '01JA0000000000000000000011',
  '01JA0000000000000000000003',
  'PSJ-R6H-Y3D',
  1500, 1500, 'Tiago Almeida',
  'active',
  '2026-03-16T09:00:00Z',
  '2031-03-16T09:00:00Z',
  '2026-03-16T09:00:00Z'
);

-- Vinhos do Monte: fully used voucher, €40
INSERT OR IGNORE INTO vouchers (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
VALUES (
  '01JA0000000000000000000033',
  '01JA0000000000000000000012',
  '01JA0000000000000000000004',
  'VDM-B5G-K9E',
  4000, 0, 'Beatriz Nunes',
  'used',
  '2026-03-01T15:00:00Z',
  '2031-03-01T15:00:00Z',
  '2026-03-14T18:00:00Z'
);

-- ─── Redemptions ────────────────────────────────────────────────
-- Café Flor: partial redemption on the €50 voucher (€20 coffee + pastry)
INSERT OR IGNORE INTO redemptions (id, store_id, voucher_id, redeemed_by, description, amount, balance_after, created_at)
VALUES (
  '01JA0000000000000000000040',
  '01JA0000000000000000000010',
  '01JA0000000000000000000031',
  '01JA0000000000000000000002',
  'Café e pastel de nata',
  2000, 3000,
  '2026-03-12T16:30:00Z'
);

-- Vinhos do Monte: full redemption on the €40 voucher
INSERT OR IGNORE INTO redemptions (id, store_id, voucher_id, redeemed_by, description, amount, balance_after, created_at)
VALUES (
  '01JA0000000000000000000041',
  '01JA0000000000000000000012',
  '01JA0000000000000000000033',
  '01JA0000000000000000000004',
  'Garrafa de vinho Alentejano',
  4000, 0,
  '2026-03-14T18:00:00Z'
);

-- ─── Commissions ────────────────────────────────────────────────
-- 5% of each voucher created (min €0.50, max €2.00)

-- Café Flor €25 voucher → 5% = €1.25
INSERT OR IGNORE INTO commissions (id, store_id, voucher_id, amount, paid_at, created_at)
VALUES (
  '01JA0000000000000000000050',
  '01JA0000000000000000000010',
  '01JA0000000000000000000030',
  125, NULL,
  '2026-03-15T14:00:00Z'
);

-- Café Flor €50 voucher → 5% = €2.50, capped at €2.00
INSERT OR IGNORE INTO commissions (id, store_id, voucher_id, amount, paid_at, created_at)
VALUES (
  '01JA0000000000000000000051',
  '01JA0000000000000000000010',
  '01JA0000000000000000000031',
  200, '2026-03-13T10:00:00Z',
  '2026-03-10T11:00:00Z'
);

-- Padaria São Jorge €15 voucher → 5% = €0.75
INSERT OR IGNORE INTO commissions (id, store_id, voucher_id, amount, paid_at, created_at)
VALUES (
  '01JA0000000000000000000052',
  '01JA0000000000000000000011',
  '01JA0000000000000000000032',
  75, NULL,
  '2026-03-16T09:00:00Z'
);

-- Vinhos do Monte €40 voucher → 5% = €2.00
INSERT OR IGNORE INTO commissions (id, store_id, voucher_id, amount, paid_at, created_at)
VALUES (
  '01JA0000000000000000000053',
  '01JA0000000000000000000012',
  '01JA0000000000000000000033',
  200, NULL,
  '2026-03-01T15:00:00Z'
);
