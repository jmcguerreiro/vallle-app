/**
 * PATCH /api/commissions/:id — Mark a commission as paid.
 * Gated to super_admin by functions/api/commissions/_middleware.js.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPatch(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const paidAt = new Date().toISOString();

    // Atomic: only update if not already paid, avoids TOCTOU race
    const result = await env.DB.prepare(
      "UPDATE commissions SET paid_at = ? WHERE id = ? AND paid_at IS NULL",
    )
      .bind(paidAt, id)
      .run();

    if (!result.meta.changes) {
      // Check if it exists at all vs already paid
      const existing = await env.DB.prepare(
        "SELECT id, paid_at FROM commissions WHERE id = ?",
      )
        .bind(id)
        .first();

      if (!existing) {
        return Response.json(
          {
            error: {
              message: "Commission not found",
              code: "COMMISSION_NOT_FOUND",
            },
          },
          { status: 404 },
        );
      }

      return Response.json(
        {
          error: {
            message: "Commission is already marked as paid",
            code: "COMMISSION_ALREADY_PAID",
          },
        },
        { status: 409 },
      );
    }

    const commission = await env.DB.prepare(
      "SELECT * FROM commissions WHERE id = ?",
    )
      .bind(id)
      .first();

    return Response.json({ data: commission });
  } catch (error) {
    const err = new Error("Commissions: Failed to mark commission as paid");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
