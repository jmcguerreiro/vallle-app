/**
 * PATCH /api/admin/subscriptions/periods/:id — Mark a subscription period as paid.
 * Gated to super_admin by functions/api/admin/_middleware.js.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPatch(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const paidAt = new Date().toISOString();

    // Atomic: only update if not already paid, avoids TOCTOU race.
    const result = await env.DB.prepare(
      "UPDATE subscription_periods SET paid_at = ? WHERE id = ? AND paid_at IS NULL",
    )
      .bind(paidAt, id)
      .run();

    if (!result.meta.changes) {
      const existing = await env.DB.prepare(
        "SELECT id, paid_at FROM subscription_periods WHERE id = ?",
      )
        .bind(id)
        .first();

      if (!existing) {
        return Response.json(
          {
            error: {
              message: "Subscription period not found",
              code: "SUBSCRIPTION_PERIOD_NOT_FOUND",
            },
          },
          { status: 404 },
        );
      }

      return Response.json(
        {
          error: {
            message: "Subscription period is already marked as paid",
            code: "SUBSCRIPTION_PERIOD_ALREADY_PAID",
          },
        },
        { status: 409 },
      );
    }

    const period = await env.DB.prepare(
      "SELECT * FROM subscription_periods WHERE id = ?",
    )
      .bind(id)
      .first();

    return Response.json({ data: period });
  } catch (error) {
    const err = new Error(
      "Subscriptions: Failed to mark subscription period as paid",
    );
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
