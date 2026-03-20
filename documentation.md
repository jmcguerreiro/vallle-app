# Vallle — project documentation

## What is Vallle?

Vallle is a voucher platform for local businesses. Stores sell branded physical postcards as gift vouchers. Customers buy them in-store, write a personal message, and give them to someone. The recipient redeems the voucher at the store, partially or fully.

Vallle earns 5% commission on every voucher created (min €0.50, max €2.00), collected directly from the store.

### How it works

1. Store owner logs into the Vallle app, creates a voucher, gets a unique code
2. Store writes the code and amount on a physical Vallle postcard, customer pays
3. Customer writes a personal message and gives the postcard as a gift
4. Recipient visits the store, presents the voucher at checkout
5. Store owner logs in, redeems the voucher (full or partial)
6. Remaining balance stays on the voucher until fully used or expired (5 years)

### Revenue model

- 5% of every voucher created
- Minimum commission: €0.50
- Maximum commission: €2.00
- Collected directly from stores — you select which commissions to mark as paid

### Onboarding

- Invite-only: you onboard each store manually
- €50 setup fee includes 50 branded postcards + account setup
- Postcard restocks at cost-plus (~€20–25 for 50)

---

## Infrastructure

**Stack:** Cloudflare ecosystem — D1 (database), Pages (frontend + API hosting).

### Repos

- **`vallle-site`** — Hugo. Public marketing site. Deployed to Cloudflare Pages. Can query public API endpoints (e.g. store map).
- **`vallle-app`** — React + Vite frontend + Cloudflare Pages Functions (API). Single repo, single deployment. D1 database bound here.

Both repos deploy to Cloudflare Pages. The API lives inside `vallle-app` as Pages Functions — no separate Workers project needed.

### Folder structure (vallle-app)

```
vallle-app/
├── functions/                ← Pages Functions (API)
│   └── api/
│       ├── auth/
│       │   ├── _helpers.js          Shared auth utilities (JWT, passwords, cookies)
│       │   ├── _email.js            Email sending via Resend API
│       │   ├── login.js
│       │   ├── logout.js
│       │   ├── me.js
│       │   ├── forgot-password.js
│       │   └── reset-password.js
│       ├── stores/
│       │   ├── index.js          GET /api/stores
│       │   ├── [id].js           GET /api/stores/:id
│       │   └── public.js         GET /api/stores/public (for Hugo site)
│       ├── vouchers/
│       │   ├── index.js          POST create, GET list
│       │   └── [id]/
│       │       ├── index.js
│       │       └── redeem.js     POST /api/vouchers/:id/redeem
│       └── commissions/
│           └── index.js
├── src/                      ← React + Vite (feature-based structure)
│   ├── features/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx
│   │   ├── vouchers/
│   │   │   ├── CreateVoucher.jsx
│   │   │   ├── RedeemVoucher.jsx
│   │   │   └── VoucherList.jsx
│   │   └── commissions/
│   │       └── Commissions.jsx
│   ├── components/
│   │   └── forms/
│   │       ├── Form.jsx
│   │       └── Input.jsx
│   ├── services/
│   │   └── api.js
│   ├── router/
│   │   ├── AuthGuard.jsx
│   │   └── RoleGuard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── migrations/
│   └── 0001_init.sql
├── public/
├── index.html
├── package.json
├── vite.config.js
└── wrangler.toml
```

Frontend uses a **feature-based folder structure** — each feature owns its components, hooks, and logic. Shared utilities live in `src/shared/`. File paths in `functions/` map directly to API routes. `functions/api/vouchers/index.js` → `/api/vouchers`. D1 is accessed in functions via `context.env.DB`.

### Database: Cloudflare D1

D1 is SQLite at the edge. All monetary values stored as integers in cents (e.g. 5000 = €50.00) to avoid floating-point rounding.

IDs are ULIDs (sortable, time-based, shorter than UUIDs). Dates are ISO 8601 text strings (SQLite has no native datetime type).

#### Schema (v6) — 7 tables

```
users                   Who logs in (role: admin or super_admin)
stores                  Local businesses
store_users             Many-to-many (user can manage multiple stores, store can have multiple admins)
vouchers                The core entity — created by stores, redeemed by recipients
redemptions             Each partial or full use of a voucher
commissions             One row per voucher created — your 5% cut, with paid_at tracking
password_reset_tokens   Time-limited tokens for password reset flow
```

**users** — `id`, `name`, `email` (unique), `password` (hashed), `role` (admin/super_admin), `status`, `created_at`, `updated_at`

**stores** — `id`, `name`, `slug` (unique), `category`, `email`, `vat_id`, `phone`, `address1`, `address2`, `city`, `postal_code`, `region`, `country` (default PT), `status`, `created_at`, `updated_at`

**store_users** — `id`, `store_id`, `user_id`, `role` (admin/staff), `created_at`. Unique constraint on (store_id, user_id).

**vouchers** — `id`, `store_id`, `created_by` (user), `code` (unique, 9 chars, handwriting-friendly), `amount`, `balance`, `buyer`, `status` (active/used/expired), `created_at`, `expires_at` (+5 years), `updated_at`

**redemptions** — `id`, `store_id` (denormalised for fast queries), `voucher_id`, `redeemed_by` (user), `description`, `amount`, `balance_after` (snapshot), `created_at`

**commissions** — `id`, `store_id` (denormalised), `voucher_id`, `amount`, `paid_at` (null = unpaid), `created_at`. Partial index on unpaid rows.

**password_reset_tokens** — `id`, `user_id`, `token_hash` (SHA-256 of the raw token), `expires_at`, `used_at` (null = unused), `created_at`. Indexed on `token_hash` for fast lookup and `user_id` for invalidation. `ON DELETE CASCADE` on user_id.

#### Password reset

Separate `password_reset_tokens` table. Raw token sent in email link, only SHA-256 hash stored in DB. Tokens expire after 30 minutes. On successful reset, all tokens for that user are marked as used. Supports multiple concurrent tokens (e.g. user requests reset on phone then laptop). Provides audit trail of reset attempts.

#### Voucher codes

9 alphanumeric characters in groups of 3: `XTU-TER-T61`. Uses a 30-character alphabet excluding ambiguous characters (0/O, 1/I/L) to avoid handwriting confusion.

#### Commission collection

No formal invoicing system. Each commission row has a `paid_at` field. To collect: view unpaid commissions for a store, select the ones covered by the payment, mark as paid. Supports partial collection naturally.

#### Expiry

Handled in app logic, not via cron. When a voucher is looked up, check `expires_at` against current time. If expired, treat as expired regardless of `status` field. No scheduled worker needed.

---

## Setup

### 1. Create repos

- `vallle-site` — Hugo site (public marketing)
- `vallle-app` — React + Vite + Pages Functions

### 2. Scaffold the app (vallle-app)

```bash
# Create Vite project with React
npm create vite@latest vallle-app -- --template react
cd vallle-app
npm install

# Add wrangler for Cloudflare
npm install -D wrangler

# Create folder structure
mkdir -p functions/api/auth
mkdir -p functions/api/stores
mkdir -p functions/api/vouchers
mkdir -p functions/api/commissions
mkdir -p migrations
mkdir -p src/components src/pages src/hooks src/lib
```

### 3. Configure wrangler

Create `wrangler.toml` in the project root:

```toml
name = "vallle-app"
compatibility_date = "2026-03-17"

[[d1_databases]]
binding = "DB"
database_name = "vallle-db"
database_id = "<your-database-id>"
```

### 4. Create D1 database

```bash
# Login to Cloudflare
npx wrangler login

# Create the database
npx wrangler d1 create vallle-db
# Copy the database_id into wrangler.toml

# Run migration (remote)
npx wrangler d1 execute vallle-db --remote --file=./migrations/0001_init.sql

# Verify
npx wrangler d1 execute vallle-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
# Should show: commissions, redemptions, store_users, stores, users, vouchers
```

### 5. Local development

```bash
# Seed local D1
npx wrangler d1 execute vallle-db --file=./migrations/0001_init.sql
npx wrangler d1 execute vallle-db --file=./migrations/0002_seed.sql

# Generate password hash for seed data (first time only)
node scripts/hash-password.js vallle123
# Then replace placeholder hashes in 0002_seed.sql with the output

# Run dev server (Vite + Pages Functions + local D1)
npx wrangler pages dev -- npx vite
```

### 6. Tooling

- **Path aliasing**: `@` → `src/` configured in `vite.config.js`. Use `@/shared/utils` instead of relative paths.
- **ESLint**: Flat config in `eslint.config.js`. Includes Prettier compat, import ordering (React first, then external, then `@/` internals), Unicorn, and React best practices. Run with `npm run lint`.
- **Import resolver**: `eslint-import-resolver-alias` wired to the same `@` → `src/` mapping so ESLint can resolve aliased imports.
- **Coding conventions**: Documented in `CLAUDE.md` — agents and contributors should follow those rules.

### Pages project (TODO)

_Cloudflare Pages deployment config to be documented when we deploy._

---

## Design

### Brand

- **Primary colour:** Terracotta (#C4653A)
- **Palette:** Linen (#F5E6D8), Espresso (#2C2520), Sage (#7A9B76), Parchment (#E8DDD3), Honey (#D4A574)
- **Display font:** DM Serif Display
- **Body font:** DM Sans Light
- **Tone:** Warm, personal, local, handmade feel, not corporate

### Postcard layout

- **Front:** Store's branded cover image, store name, Vallle watermark
- **Back left:** Voucher amount, code, sender name, Vallle logo
- **Back right:** Blank space for handwritten message
- **Bottom rows:** Space for transaction log (date, description, amount)

---

## Decision log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-03-17 | Cloudflare D1 for database | SQLite at the edge, zero config, pairs with Pages |
| 2026-03-17 | ULIDs for IDs | Sortable by time, shorter than UUIDs |
| 2026-03-17 | Money in cents as integers | Avoids floating-point rounding errors |
| 2026-03-17 | Structured address fields | Single field too limited for maps/validation/grouping |
| 2026-03-17 | Many-to-many users ↔ stores | User can manage multiple stores, store can have multiple admins |
| 2026-03-17 | No formal invoicing | Simple commission tracking with paid_at flag, manual collection |
| 2026-03-17 | 5-year voucher expiry | EU legal minimum, enforced in app logic not cron |
| 2026-03-17 | store_id denormalised on redemptions | Avoids join for common "today's redemptions" query |
| 2026-03-17 | English codebase, i18n for frontend | Clean code, translations handled separately |
| 2026-03-17 | Single app with super_admin role | No separate admin app — role field on users controls what you see |
| 2026-03-17 | Two repos (vallle-site + vallle-app) | Site is static Hugo, app is React + API in one Pages project |
| 2026-03-17 | API as Pages Functions, not separate Workers | Lives in same repo as frontend, one deployment, D1 binding built in |
| 2026-03-17 | React + Vite + JavaScript | Modern, fast, good Cloudflare Pages support |
| 2026-03-17 | PWA over Tauri | Works on any device without install, single deployment target |
| 2026-03-17 | Vite path alias (`@` → `src/`) | Cleaner imports, avoids fragile relative paths |
| 2026-03-17 | ESLint flat config with Prettier, Unicorn, import ordering | Consistent style enforcement, auto-sorted imports, React best practices |
| 2026-03-17 | CLAUDE.md for agent coding conventions | Living reference so AI agents follow project standards |
| 2026-03-17 | JWT auth in httpOnly cookies (HMAC-SHA256) | Stateless, works at the edge, no session table needed. Web Crypto API built into Workers |
| 2026-03-17 | PBKDF2-SHA256 for password hashing (100k iterations) | Industry standard, available via Web Crypto API in Workers |
| 2026-03-17 | react-router-dom for client routing | Standard SPA routing, well-supported with React 19 |
| 2026-03-17 | react-i18next for internationalisation | PT as default language, EN fallback. Translation files in src/i18n/ |
| 2026-03-17 | Feature-based folder structure | Each feature (auth, vouchers, etc.) owns its components. Shared code in src/shared/ |
| 2026-03-17 | BEM naming for CSS classes | Consistent, readable class naming (c-block__element--modifier) |
| 2026-03-17 | Seed data with Portuguese local businesses | 3 sample stores (café, padaria, garrafeira), 4 users, vouchers, redemptions, and commissions |
| 2026-03-18 | User roles renamed: 'user' → 'admin' | Clearer naming — 'admin' and 'super_admin'. Migration 0003 handles existing data |
| 2026-03-18 | Two-layer route protection (AuthGuard + RoleGuard) | Authentication and authorisation are separate concerns. RoleGuard blocks direct URL access to role-restricted pages |
| 2026-03-18 | react-hook-form for all forms | Uncontrolled inputs, less re-renders, built-in validation. Shared Form + Input components in components/forms/ |
| 2026-03-18 | Password reset via email link (Resend API) | Tokenised reset flow with 30-min expiry. Only token hash stored in DB. Resend chosen for simplicity — single fetch call from Workers, no SDK |
| 2026-03-18 | Separate password_reset_tokens table | Audit trail of reset attempts, supports multiple concurrent tokens, cleaner separation from users table. Industry standard (Laravel, NextAuth) |
