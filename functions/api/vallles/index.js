import { buildLikePattern, parseListQuery } from "../_list.js";
import { generateUlid } from "../_ulid.js";
import {
  validateAmount,
  validateBuyer,
  validateExpiry,
} from "./_validation.js";

/**
 * Characters used for vallle code generation.
 * Excludes confusing characters: O, 0, I, 1, L.
 */
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Length of a vallle code. Codes are unique per store (not globally), so a
 * short code gives each store the full 31^6 ≈ 887M space to itself.
 */
const CODE_LENGTH = 6;

/** Max insert attempts before giving up on finding a free code in a store. */
const MAX_CODE_ATTEMPTS = 5;

/**
 * Generates a 6-character vallle code, e.g. "XTUT6Q". Stored raw (no
 * separator); the UI displays it grouped as "XTU-T6Q". Uniqueness is enforced
 * per store by the DB constraint + insert retry, not by the code length.
 * @returns {string}
 */
function generateVallleCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

/**
 * GET /api/vallles — List vallles for the active store.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env, data } = context;
  const { storeId } = data.store;

  try {
    const url = new URL(request.url);
    const { limit, offset, search, sort, order } = parseListQuery(url, {
      sortableColumns: new Set([
        "code",
        "buyer",
        "amount",
        "balance",
        "created_at",
        "expires_at",
      ]),
      defaultSort: "created_at",
    });
    const status = url.searchParams.get("status") || "all";

    const where = ["store_id = ?"];
    const params = [storeId];

    if (search) {
      const like = buildLikePattern(search);
      const clauses = [
        String.raw`code LIKE ? ESCAPE '\'`,
        String.raw`buyer LIKE ? ESCAPE '\'`,
      ];
      const searchParams = [like, like];

      // Numeric search — match amount/balance. Input is in euros (e.g. "50"
      // or "50.5"); DB stores cents. Match if the row's cent value, when
      // formatted as a 2-decimal euro string, contains the query.
      const numeric = search.replace(",", ".");
      if (/^\d+(\.\d{1,2})?$/.test(numeric)) {
        clauses.push(
          "printf('%.2f', amount / 100.0) LIKE ?",
          "printf('%.2f', balance / 100.0) LIKE ?",
        );
        searchParams.push(`%${numeric}%`, `%${numeric}%`);
      }

      where.push(`(${clauses.join(" OR ")})`);
      params.push(...searchParams);
    }

    const now = new Date().toISOString();
    switch (status) {
      case "archived": {
        where.push("status = 'archived'");

        break;
      }
      case "expired": {
        where.push("status != 'archived' AND expires_at < ?");
        params.push(now);

        break;
      }
      case "used": {
        where.push("status != 'archived' AND balance = 0 AND expires_at >= ?");
        params.push(now);

        break;
      }
      case "active": {
        where.push("status != 'archived' AND balance > 0 AND expires_at >= ?");
        params.push(now);

        break;
      }
      // No default
    }

    const whereSql = where.join(" AND ");

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) as total FROM vallles WHERE ${whereSql}`,
      ).bind(...params),
      env.DB.prepare(
        `SELECT * FROM vallles WHERE ${whereSql} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
      ).bind(...params, limit, offset),
    ]);

    const total = countResult.results[0].total;

    return Response.json({
      data: dataResult.results,
      meta: { total, limit, offset },
    });
  } catch (error) {
    const err = new Error("Vallles: Failed to list vallles");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * POST /api/vallles — Create a new vallle.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
  const { request, env, data } = context;
  const { user } = data;
  const { storeId, storeStatus } = data.store;

  // A suspended store stays readable but cannot emit new vallles.
  if (storeStatus !== "active") {
    return Response.json(
      {
        error: {
          message: "Store is suspended. Vallle creation is disabled.",
          code: "STORE_SUSPENDED",
        },
      },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid JSON body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  let { amount, buyer, expires_at } = body;

  const amountError = validateAmount(amount);
  if (amountError) return amountError;

  const buyerError = validateBuyer(buyer);
  if (buyerError) return buyerError;

  // If no expires_at provided, compute from the store's default expiry period.
  if (!expires_at) {
    const store = await env.DB.prepare(
      "SELECT default_vallle_expiry_days FROM stores WHERE id = ?",
    )
      .bind(storeId)
      .first();

    const days = store?.default_vallle_expiry_days || 365;
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + days);
    expires_at = defaultExpiry.toISOString();
  }

  const expiryError = validateExpiry(expires_at);
  if (expiryError) return expiryError;

  const expiryDate = new Date(expires_at);
  const now = new Date().toISOString();
  const vallleId = generateUlid();
  const commissionId = generateUlid();
  const commissionAmount = Math.max(50, Math.round(amount * 0.05));

  // Codes are only unique per store, so a generated code can collide with an
  // existing one. Retry with a fresh code when the UNIQUE(store_id, code)
  // constraint rejects the insert; rethrow any other failure immediately.
  let lastError;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const vallle = {
      id: vallleId,
      store_id: storeId,
      created_by: user.sub,
      code: generateVallleCode(),
      amount,
      balance: amount,
      buyer: buyer || null,
      status: "active",
      created_at: now,
      expires_at: expiryDate.toISOString(),
      updated_at: now,
    };

    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO vallles (id, store_id, created_by, code, amount, balance, buyer, status, created_at, expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          vallle.id,
          vallle.store_id,
          vallle.created_by,
          vallle.code,
          vallle.amount,
          vallle.balance,
          vallle.buyer,
          vallle.status,
          vallle.created_at,
          vallle.expires_at,
          vallle.updated_at,
        ),
        env.DB.prepare(
          `INSERT INTO commissions (id, store_id, vallle_id, amount, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        ).bind(commissionId, storeId, vallleId, commissionAmount, now),
      ]);

      return Response.json({ data: vallle }, { status: 201 });
    } catch (error) {
      lastError = error;
      const isCodeCollision =
        /UNIQUE constraint failed: vallles\.(code|store_id)/i.test(
          error?.message ?? "",
        );
      if (!isCodeCollision) {
        const err = new Error("Vallles: Failed to create vallle");
        err.code = "DB_WRITE_FAILED";
        err.cause = error;
        throw err;
      }
    }
  }

  const err = new Error("Vallles: Failed to generate a unique vallle code");
  err.code = "DB_WRITE_FAILED";
  err.cause = lastError;
  throw err;
}
