import {
  validateBuyer,
  validateExpiry,
  validateMinRedemption,
} from "./_validation.js";

/**
 * GET /api/vallles/:id — Get a single vallle by ID.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { env, params, data } = context;
  const { id } = params;
  const { storeId } = data.store;

  try {
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

    return Response.json({ data: vallle });
  } catch (error) {
    const err = new Error("Vallles: Failed to read vallle");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/vallles/:id — Update a vallle (buyer and expiry date only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPut(context) {
  const { request, env, params, data } = context;
  const { id } = params;
  const { storeId } = data.store;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid JSON body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const { buyer, expires_at, status, min_redemption_mode } = body;
  let { min_redemption_cents } = body;

  const buyerError = validateBuyer(buyer);
  if (buyerError) return buyerError;

  const minRedemptionError = validateMinRedemption(
    min_redemption_mode,
    min_redemption_cents,
  );
  if (minRedemptionError) return minRedemptionError;

  // Only active/archived can be set manually; 'used' is system-managed.
  if (status !== undefined && status !== "active" && status !== "archived") {
    return Response.json(
      {
        error: {
          message: "Status must be active or archived",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  if (expires_at) {
    const expiryError = validateExpiry(expires_at);
    if (expiryError) return expiryError;
  }

  try {
    const existing = await env.DB.prepare(
      "SELECT * FROM vallles WHERE id = ? AND store_id = ?",
    )
      .bind(id, storeId)
      .first();

    if (!existing) {
      return Response.json(
        { error: { message: "Vallle not found", code: "VALLLE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const updatedBuyer = buyer !== undefined ? buyer : existing.buyer;
    const updatedExpiresAt = expires_at
      ? new Date(expires_at).toISOString()
      : existing.expires_at;
    // Only allow status transitions between active and archived; preserve 'used' otherwise.
    const updatedStatus =
      status !== undefined && existing.status !== "used"
        ? status
        : existing.status;

    const updatedMinMode =
      min_redemption_mode !== undefined
        ? min_redemption_mode
        : existing.min_redemption_mode;
    // The cents column is only meaningful for 'custom'; zero it otherwise.
    if (updatedMinMode !== "custom") min_redemption_cents = 0;
    const updatedMinCents =
      min_redemption_mode !== undefined
        ? min_redemption_cents
        : existing.min_redemption_cents;

    await env.DB.prepare(
      "UPDATE vallles SET buyer = ?, expires_at = ?, status = ?, min_redemption_mode = ?, min_redemption_cents = ?, updated_at = ? WHERE id = ? AND store_id = ?",
    )
      .bind(
        updatedBuyer,
        updatedExpiresAt,
        updatedStatus,
        updatedMinMode,
        updatedMinCents,
        now,
        id,
        storeId,
      )
      .run();

    const vallle = {
      ...existing,
      buyer: updatedBuyer,
      expires_at: updatedExpiresAt,
      status: updatedStatus,
      min_redemption_mode: updatedMinMode,
      min_redemption_cents: updatedMinCents,
      updated_at: now,
    };

    return Response.json({ data: vallle });
  } catch (error) {
    const err = new Error("Vallles: Failed to update vallle");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
