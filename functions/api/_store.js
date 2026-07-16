/**
 * Shared store helpers for Pages Functions.
 * Reads the active store ID from the X-Store-Id header and resolves the
 * authenticated user's store-scoped membership.
 *
 * Two distinct status concepts:
 * - Membership (`store_users.status`): `active`/`inactive` — whether this user
 *   can access this store. `role` (`admin`/`user`) is likewise store-scoped.
 * - Store (`stores.status`): `active`/`suspended`/`inactive`, set by the
 *   platform super_admin. `suspended` keeps the store readable but blocks new
 *   vallle creation; `inactive` removes access entirely.
 */

import { normalizeDateInput } from "./_dates.js";
import { PLAN_IDS } from "./_plans.js";
import { validateMinRedemption } from "./vallles/_validation.js";

/**
 * Reads the X-Store-Id header from the request.
 * @param {Request} request
 * @returns {string|null}
 */
export function getStoreId(request) {
  return request.headers.get("X-Store-Id") || null;
}

/**
 * Reads the store ID from the request header and resolves the user's
 * store-scoped membership. Returns a Response if validation fails, otherwise the
 * store ID, the caller's store role, and the store's status.
 *
 * Access is denied (403) when the user has no membership, the membership is
 * inactive, or the store itself is inactive. A suspended store is allowed
 * through (read access); creation handlers gate writes on `storeStatus`.
 * @param {Request} request
 * @param {Object} env - Cloudflare env bindings
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<{ storeId: string, storeRole: string, storeStatus: string }|Response>}
 */
export async function requireStore(request, env, userId) {
  const storeId = getStoreId(request);

  if (!storeId) {
    return Response.json(
      {
        error: {
          message: "X-Store-Id header is required",
          code: "STORE_MISSING",
        },
      },
      { status: 400 },
    );
  }

  const row = await env.DB.prepare(
    `SELECT su.role AS member_role, su.status AS member_status,
            s.status AS store_status
       FROM store_users su
       JOIN stores s ON s.id = su.store_id
      WHERE su.user_id = ? AND su.store_id = ?`,
  )
    .bind(userId, storeId)
    .first();

  if (
    !row ||
    row.member_status === "inactive" ||
    row.store_status === "inactive"
  ) {
    return Response.json(
      {
        error: { message: "No access to this store", code: "STORE_FORBIDDEN" },
      },
      { status: 403 },
    );
  }

  return {
    storeId,
    storeRole: row.member_role,
    storeStatus: row.store_status,
  };
}

/**
 * Builds a URL-safe slug from arbitrary text. Strips diacritics (so accented
 * letters map to their base form — "parágrafo" → "paragrafo", not "par-grafo"),
 * lowercases, collapses any run of non-alphanumerics into a single dash, and
 * trims leading/trailing dashes. Keep this in sync with the client copy in
 * `src/utils/slug.js`.
 * @param {string} value - Raw text (e.g. a company name)
 * @returns {string}
 */
export function slugify(value) {
  return (value ?? "")
    .toString()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

/** Columns returned when reading a single store record (by id). */
export const STORE_SELECT = `SELECT id, name, slug, category, email, vat_id, phone, address1, address2, city, postal_code, region, country, default_vallle_expiry_days, default_min_redemption_mode, default_min_redemption_cents, plan, plan_renews_at, is_founding_member, status, created_at FROM stores WHERE id = ?`;

/** Free-text store fields a client may edit. `status` and expiry are handled separately. */
const STORE_EDITABLE_FIELDS = [
  "name",
  "category",
  "email",
  "vat_id",
  "phone",
  "address1",
  "address2",
  "city",
  "postal_code",
  "region",
  "country",
];

const STORE_STATUSES = new Set(["active", "suspended", "inactive"]);
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 1825; // 5 years

/**
 * Validates the optional `default_vallle_expiry_days` field (1–1825). Returns a
 * 400 `Response` when present-but-invalid, or `null` when absent or valid.
 * @param {unknown} value - Raw `body.default_vallle_expiry_days`
 * @returns {Response|null}
 */
export function validateStoreExpiryDays(value) {
  if (value === undefined) return null;
  const days = Number.parseInt(value, 10);
  if (Number.isNaN(days) || days < MIN_EXPIRY_DAYS || days > MAX_EXPIRY_DAYS) {
    return Response.json(
      {
        error: {
          message: "Default expiry must be between 1 and 1825 days",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Validates the store's optional minimum-redemption default. Thin wrapper over
 * the shared `validateMinRedemption` that reads the `default_*`-prefixed body
 * fields. Returns a 400 `Response` when present-but-invalid, or `null` when
 * absent or valid. Call before `buildStoreUpdate`.
 * @param {Object} body - Parsed request body
 * @returns {Response|null}
 */
export function validateStoreMinRedemption(body) {
  return validateMinRedemption(
    body.default_min_redemption_mode,
    body.default_min_redemption_cents,
  );
}

/**
 * Validates the optional `status` field against the allowed store statuses.
 * Returns a 400 `Response` when present-but-invalid, or `null` when absent or
 * valid. Call before `buildStoreUpdate({ allowStatus: true })`.
 * @param {unknown} value - Raw `body.status`
 * @returns {Response|null}
 */
export function validateStoreStatus(value) {
  if (value === undefined) return null;
  if (!STORE_STATUSES.has(value)) {
    return Response.json(
      { error: { message: "Invalid store status", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Validates the optional `plan` field against the allowed plan ids. Returns a
 * 400 `Response` when present-but-invalid, or `null` when absent or valid. Call
 * before `buildStoreUpdate({ allowPlan: true })`.
 * @param {unknown} value - Raw `body.plan`
 * @returns {Response|null}
 */
export function validateStorePlan(value) {
  if (value === undefined) return null;
  if (!PLAN_IDS.includes(value)) {
    return Response.json(
      { error: { message: "Invalid plan", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Normalises a `plan_renews_at` value. Shared by store create and update so
 * they store the same shape. See `normalizeDateInput` in `_dates.js`.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizePlanRenewsAt(value) {
  return normalizeDateInput(value);
}

/**
 * Coerces an `is_founding_member` value (boolean, `1`, or `"1"`) to `0`/`1`.
 * @param {unknown} value
 * @returns {number}
 */
export function coerceFoundingMember(value) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

/**
 * Builds the `SET ...` clause and bound values for a store UPDATE from a request
 * body. This is a partial update: only fields actually present in the body are
 * written, so an omitted field is left unchanged (an explicit `""` still clears
 * it). Optionally includes `status` (admin only), the subscription plan fields
 * (`plan`/`plan_renews_at`/`is_founding_member`, admin only), and
 * `default_vallle_expiry_days` when present. Validate `status` with
 * `validateStoreStatus`, `plan` with `validateStorePlan`, expiry with
 * `validateStoreExpiryDays`, and the minimum-redemption default with
 * `validateStoreMinRedemption` before calling.
 * @param {Object} body - Parsed request body
 * @param {Object} [options]
 * @param {boolean} [options.allowStatus=false] - Whether `status` may be updated
 * @param {boolean} [options.allowPlan=false] - Whether the plan fields may be updated
 * @returns {{ sets: string, values: Array }}
 */
export function buildStoreUpdate(
  body,
  { allowStatus = false, allowPlan = false } = {},
) {
  const columns = [];
  const values = [];

  for (const f of STORE_EDITABLE_FIELDS) {
    if (body[f] !== undefined) {
      columns.push(f);
      values.push((body[f] ?? "").toString().trim());
    }
  }

  if (allowStatus && body.status !== undefined) {
    columns.push("status");
    values.push(body.status);
  }

  // Subscription plan fields — admin only. Set by the super_admin at renewal;
  // not editable by store admins (the store self-edit endpoint omits allowPlan).
  if (allowPlan) {
    if (body.plan !== undefined) {
      columns.push("plan");
      values.push(body.plan);
    }
    if (body.plan_renews_at !== undefined) {
      columns.push("plan_renews_at");
      values.push(normalizePlanRenewsAt(body.plan_renews_at));
    }
    if (body.is_founding_member !== undefined) {
      columns.push("is_founding_member");
      values.push(coerceFoundingMember(body.is_founding_member));
    }
  }

  if (body.default_vallle_expiry_days !== undefined) {
    columns.push("default_vallle_expiry_days");
    values.push(Number.parseInt(body.default_vallle_expiry_days, 10));
  }

  if (body.default_min_redemption_mode !== undefined) {
    const mode = body.default_min_redemption_mode;
    columns.push("default_min_redemption_mode");
    values.push(mode);
    // The cents column is only meaningful for 'custom'; zero it otherwise so a
    // stale amount never lingers behind a none/full mode.
    columns.push("default_min_redemption_cents");
    values.push(
      mode === "custom"
        ? Number.parseInt(body.default_min_redemption_cents, 10)
        : 0,
    );
  }

  return { sets: columns.map((f) => `${f} = ?`).join(", "), values };
}
