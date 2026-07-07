/**
 * Shared test helpers: fixture seeding, authenticated request building, and a
 * minimal Pages Functions handler-chain runner. All fixtures write through the
 * real D1 binding from `cloudflare:test`; vitest-pool-workers' isolated
 * storage rolls each test's writes back automatically.
 */

import { env } from "cloudflare:test";

import { generateUlid } from "../functions/api/_ulid.js";
import { signJwt } from "../functions/api/auth/_helpers.js";

const FUTURE = "2030-01-01T00:00:00Z";
const PAST = "2020-01-01T00:00:00Z";
const NOW = "2026-01-01T00:00:00Z";

export { FUTURE, PAST };

/**
 * Inserts a user and returns its id.
 * @param {Object} [overrides] - Column overrides (role, status, ...)
 * @returns {Promise<string>}
 */
export async function seedUser(overrides = {}) {
  const id = generateUlid();
  const user = {
    id,
    name: "Test User",
    email: `${id.toLowerCase()}@test.local`,
    password: "not-a-real-hash",
    role: "user",
    status: "active",
    ...overrides,
  };

  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      user.id,
      user.name,
      user.email,
      user.password,
      user.role,
      user.status,
      NOW,
      NOW,
    )
    .run();

  return id;
}

/**
 * Inserts a store and returns its id.
 * @param {Object} [overrides] - Column overrides (status, default_vallle_expiry_days, ...)
 * @returns {Promise<string>}
 */
export async function seedStore(overrides = {}) {
  const id = generateUlid();
  const store = {
    id,
    name: "Test Store",
    slug: `test-store-${id.toLowerCase()}`,
    status: "active",
    default_vallle_expiry_days: 365,
    default_min_redemption_mode: "none",
    default_min_redemption_cents: 0,
    ...overrides,
  };

  await env.DB.prepare(
    `INSERT INTO stores (id, name, slug, status, default_vallle_expiry_days, default_min_redemption_mode, default_min_redemption_cents, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      store.id,
      store.name,
      store.slug,
      store.status,
      store.default_vallle_expiry_days,
      store.default_min_redemption_mode,
      store.default_min_redemption_cents,
      NOW,
      NOW,
    )
    .run();

  return id;
}

/**
 * Adds a store membership for a user.
 * @param {string} userId
 * @param {string} storeId
 * @param {Object} [overrides] - Column overrides (role, status)
 * @returns {Promise<void>}
 */
export async function seedMembership(userId, storeId, overrides = {}) {
  const membership = { role: "admin", status: "active", ...overrides };

  await env.DB.prepare(
    `INSERT INTO store_users (id, store_id, user_id, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      generateUlid(),
      storeId,
      userId,
      membership.role,
      membership.status,
      NOW,
    )
    .run();
}

/**
 * Inserts a vallle and returns its id. Defaults: €50.00, active, expires 2030.
 * @param {string} storeId
 * @param {string} userId - created_by
 * @param {Object} [overrides] - Column overrides (amount, balance, status, expires_at, ...)
 * @returns {Promise<string>}
 */
export async function seedVallle(storeId, userId, overrides = {}) {
  const id = generateUlid();
  const vallle = {
    id,
    code: id.slice(-6),
    amount: 5000,
    balance: overrides.amount ?? 5000,
    buyer: "",
    status: "active",
    expires_at: FUTURE,
    min_redemption_mode: "none",
    min_redemption_cents: 0,
    ...overrides,
  };

  await env.DB.prepare(
    `INSERT INTO vallles (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, min_redemption_mode, min_redemption_cents, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      vallle.id,
      storeId,
      userId,
      vallle.code,
      vallle.amount,
      vallle.balance,
      vallle.buyer,
      vallle.status,
      NOW,
      vallle.expires_at,
      vallle.min_redemption_mode,
      vallle.min_redemption_cents,
      NOW,
    )
    .run();

  return id;
}

/**
 * Creates a user + store + active membership in one call.
 * @param {Object} [options]
 * @param {Object} [options.user] - seedUser overrides
 * @param {Object} [options.store] - seedStore overrides
 * @param {Object} [options.membership] - seedMembership overrides
 * @returns {Promise<{ userId: string, storeId: string }>}
 */
export async function seedStoreWithUser({
  user = {},
  store = {},
  membership = {},
} = {}) {
  const userId = await seedUser(user);
  const storeId = await seedStore(store);
  await seedMembership(userId, storeId, membership);
  return { userId, storeId };
}

/**
 * Builds a Request authenticated as the given user, scoped to the given store.
 * @param {string} path - e.g. "/api/vallles"
 * @param {Object} [options]
 * @param {string} [options.userId] - Signs a session cookie for this user
 * @param {string} [options.storeId] - Sets the X-Store-Id header
 * @param {string} [options.method="GET"]
 * @param {Object|string} [options.body] - JSON-serialised unless already a string
 * @param {Object} [options.headers] - Extra headers
 * @returns {Promise<Request>}
 */
export async function buildRequest(
  path,
  { userId, storeId, method = "GET", body, headers = {} } = {},
) {
  const requestHeaders = new Headers(headers);

  if (userId) {
    const token = await signJwt({ sub: userId }, env.JWT_SECRET);
    requestHeaders.set("Cookie", `vallle_token=${token}`);
  }
  if (storeId) requestHeaders.set("X-Store-Id", storeId);

  let requestBody;
  if (body !== undefined) {
    requestBody = typeof body === "string" ? body : JSON.stringify(body);
    if (!requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }
  }

  return new Request(`http://localhost${path}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });
}

/**
 * Runs a Pages Functions handler chain (middlewares first, route handler last)
 * against a Request, mimicking how Cloudflare Pages invokes them: each handler
 * gets the shared context and `context.next()` advances to the next one.
 * @param {Function[]} handlers - e.g. [middleware.onRequest, route.onRequestPost]
 * @param {Request} request
 * @param {Object} [params] - Route params (e.g. { id })
 * @returns {Promise<Response>}
 */
export async function runRoute(handlers, request, params = {}) {
  let index = 0;

  const context = {
    request,
    env,
    params,
    data: {},
    next: () => {
      const handler = handlers[index++];
      return handler(context);
    },
  };

  return context.next();
}
