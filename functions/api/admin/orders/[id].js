import {
  buildItemsReplace,
  getOrderDetail,
  normalizeDateInput,
  validateOrderAmount,
  validateOrderItemsList,
  validateOrderStatus,
  validateOrderType,
} from "./_helpers.js";

/**
 * GET /api/admin/orders/:id — Get a single order with its items and store
 * name (super_admin only, gated by functions/api/admin/_middleware.js).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const order = await getOrderDetail(env, id);

    if (!order) {
      return Response.json(
        { error: { message: "Order not found", code: "ORDER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    return Response.json({ data: { order } });
  } catch (error) {
    const err = new Error("Admin: Failed to get order");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/admin/orders/:id — Update an order (super_admin only).
 * Partial update: only fields present in the body are written. When `items`
 * is provided the order's items are replaced wholesale.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const typeError = validateOrderType(body.type);
  if (typeError) return typeError;

  const statusError = validateOrderStatus(body.status);
  if (statusError) return statusError;

  const amountError = validateOrderAmount(body.amount);
  if (amountError) return amountError;

  if (body.items !== undefined) {
    const itemsError = validateOrderItemsList(body.items);
    if (itemsError) return itemsError;
  }

  try {
    const existing = await env.DB.prepare(
      "SELECT id, paid_at FROM orders WHERE id = ?",
    )
      .bind(id)
      .first();
    if (!existing) {
      return Response.json(
        { error: { message: "Order not found", code: "ORDER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    // A paid order was necessarily invoiced — clearing the invoice date
    // would corrupt the sequence.
    if (
      body.invoiced_at !== undefined &&
      !normalizeDateInput(body.invoiced_at) &&
      existing.paid_at
    ) {
      return Response.json(
        {
          error: {
            message: "Cannot clear the invoice date on a paid order",
            code: "VALIDATION_FAILED",
          },
        },
        { status: 400 },
      );
    }

    const columns = [];
    const values = [];

    if (body.type !== undefined) {
      columns.push("type");
      values.push(body.type);
    }
    if (body.status !== undefined) {
      columns.push("status");
      values.push(body.status);
    }
    if (body.amount !== undefined) {
      columns.push("amount");
      values.push(body.amount);
    }
    if (body.notes !== undefined) {
      columns.push("notes");
      values.push((body.notes ?? "").toString().trim());
    }
    if (body.requested_at !== undefined) {
      const requestedAt = normalizeDateInput(body.requested_at);
      if (requestedAt) {
        columns.push("requested_at");
        values.push(requestedAt);
      }
    }
    // Unlike requested_at, invoiced_at is clearable: an empty value stores
    // NULL (back to "still to invoice", e.g. after recording it by mistake).
    if (body.invoiced_at !== undefined) {
      columns.push("invoiced_at");
      values.push(normalizeDateInput(body.invoiced_at));
    }

    const now = new Date().toISOString();
    const sets = [...columns.map((f) => `${f} = ?`), "updated_at = ?"].join(
      ", ",
    );

    await env.DB.batch([
      env.DB.prepare(`UPDATE orders SET ${sets} WHERE id = ?`).bind(
        ...values,
        now,
        id,
      ),
      ...(body.items === undefined
        ? []
        : buildItemsReplace(env, id, body.items)),
    ]);

    const order = await getOrderDetail(env, id);

    return Response.json({ data: { order } });
  } catch (error) {
    const err = new Error("Admin: Failed to update order");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PATCH /api/admin/orders/:id — Record a payment step (super_admin only).
 * Body: `{ mark: "paid" | "invoiced" }` (defaults to `"paid"`, mirroring the
 * subscription-period mark-as-paid flow). `"invoiced"` stamps invoiced_at
 * (invoice sent, awaiting payment); `"paid"` stamps paid_at and requires the
 * order to be invoiced first — payment is sequential.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const { id } = params;

  let body = {};
  try {
    body = await request.json();
  } catch {
    // An empty body means the default action (mark as paid).
  }

  const mark = body.mark ?? "paid";
  if (mark !== "paid" && mark !== "invoiced") {
    return Response.json(
      { error: { message: "Invalid mark action", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }
  const column = mark === "paid" ? "paid_at" : "invoiced_at";
  // Payment is sequential: an order can't be paid before it was invoiced.
  const guard = mark === "paid" ? "AND invoiced_at IS NOT NULL" : "";

  try {
    const now = new Date().toISOString();

    // Atomic: only update if not already stamped, avoids TOCTOU race.
    const result = await env.DB.prepare(
      `UPDATE orders SET ${column} = ?, updated_at = ? WHERE id = ? AND ${column} IS NULL ${guard}`,
    )
      .bind(now, now, id)
      .run();

    if (!result.meta.changes) {
      const existing = await env.DB.prepare(
        "SELECT id, invoiced_at, paid_at FROM orders WHERE id = ?",
      )
        .bind(id)
        .first();

      if (!existing) {
        return Response.json(
          { error: { message: "Order not found", code: "ORDER_NOT_FOUND" } },
          { status: 404 },
        );
      }

      if (existing[column]) {
        return Response.json(
          {
            error:
              mark === "paid"
                ? {
                    message: "Order is already marked as paid",
                    code: "ORDER_ALREADY_PAID",
                  }
                : {
                    message: "Order is already marked as invoiced",
                    code: "ORDER_ALREADY_INVOICED",
                  },
          },
          { status: 409 },
        );
      }

      // Only remaining reason the paid update matched nothing: no invoice yet.
      return Response.json(
        {
          error: {
            message: "Order must be invoiced before it can be marked as paid",
            code: "ORDER_NOT_INVOICED",
          },
        },
        { status: 409 },
      );
    }

    const order = await getOrderDetail(env, id);

    return Response.json({ data: { order } });
  } catch (error) {
    const err = new Error(`Admin: Failed to mark order as ${mark}`);
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
