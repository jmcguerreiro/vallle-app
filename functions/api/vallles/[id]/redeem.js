import { requireAuth } from "../../auth/_helpers.js";
import { requireStore } from "../../_store.js";
import { generateUlid } from "../../_ulid.js";

/**
 * POST /api/vallles/:id/redeem — Redeem a vallle (partial or full).
 * Creates a redemption record, updates the vallle balance.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
  const { request, env, params } = context;
  const { id } = params;

  // Auth
  const auth = await requireAuth(request, env.JWT_SECRET);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  // Store
  const storeResult = await requireStore(request, env, user.sub);
  if (storeResult instanceof Response) return storeResult;
  const { storeId } = storeResult;

  // Body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid JSON body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const { amount, description } = body;

  // Validate amount (max €50,000 = 5_000_000 cents)
  if (
    !amount ||
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount > 5_000_000
  ) {
    return Response.json(
      {
        error: {
          message: "Amount must be a positive integer (cents) up to 5000000",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  // Validate description (required)
  if (
    typeof description !== "string" ||
    description.trim().length === 0 ||
    description.length > 500
  ) {
    return Response.json(
      {
        error: {
          message:
            "Description is required and must be 500 characters or fewer",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  try {
    // Fetch vallle
    const vallle = await env.DB.prepare(
      "SELECT * FROM vallles WHERE id = ? AND store_id = ?",
    )
      .bind(id, storeId)
      .first();

    if (!vallle) {
      return Response.json(
        { error: { message: "Vallle not found", code: "VALLLE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    // Check status
    if (vallle.status !== "active") {
      return Response.json(
        { error: { message: "Vallle is not active", code: "VALLLE_INACTIVE" } },
        { status: 400 },
      );
    }

    // Check expiry
    if (new Date(vallle.expires_at) < new Date()) {
      return Response.json(
        {
          error: { message: "This vallle has expired", code: "VALLLE_EXPIRED" },
        },
        { status: 400 },
      );
    }

    // Check balance
    if (amount > vallle.balance) {
      return Response.json(
        {
          error: {
            message: "Insufficient balance",
            code: "VALLLE_INSUFFICIENT_BALANCE",
          },
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const redemptionId = generateUlid();
    const balanceAfter = vallle.balance - amount;

    // Deduct the balance and record the redemption atomically in one D1 batch
    // (a transaction): either both land or neither does — no debit without a
    // matching redemption row. Both statements gate on the same balance/expiry
    // condition to prevent double-spend and last-millisecond expiry races; the
    // INSERT ... SELECT runs first and reads the pre-deduction balance, so its
    // balance_after matches the UPDATE. A 0-row write is not a D1 error, so we
    // detect "nothing happened" via the UPDATE's change count.
    const [, updateResult] = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO redemptions (id, store_id, vallle_id, redeemed_by, description, amount, balance_after, created_at)
         SELECT ?, ?, ?, ?, ?, ?, balance - ?, ?
           FROM vallles
          WHERE id = ? AND store_id = ? AND balance >= ? AND expires_at > ?`,
      ).bind(
        redemptionId,
        storeId,
        id,
        user.sub,
        description.trim(),
        amount,
        amount,
        now,
        id,
        storeId,
        amount,
        now,
      ),
      env.DB.prepare(
        `UPDATE vallles
           SET balance    = balance - ?,
               status     = CASE WHEN (balance - ?) = 0 THEN 'used' ELSE status END,
               updated_at = ?
         WHERE id = ? AND store_id = ? AND balance >= ? AND expires_at > ?`,
      ).bind(amount, amount, now, id, storeId, amount, now),
    ]);

    if (!updateResult.meta.changes) {
      return Response.json(
        {
          error: {
            message: "Insufficient balance (concurrent redemption)",
            code: "VALLLE_INSUFFICIENT_BALANCE",
          },
        },
        { status: 409 },
      );
    }

    return Response.json({
      data: {
        id: redemptionId,
        vallle_id: id,
        amount,
        balance_after: balanceAfter,
        description: description.trim(),
        created_at: now,
      },
    });
  } catch (error) {
    const err = new Error("Vallles: Failed to redeem vallle");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
