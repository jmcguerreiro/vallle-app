import {
  buildItemsReplace,
  getOrderDetail,
  normalizeDateInput,
  validateOrderAmount,
  validateOrderItemsList,
  validateOrderType,
} from "./_helpers.js";
import { buildLikePattern, parseListQuery } from "../../_list.js";
import { generateUlid } from "../../_ulid.js";

/**
 * GET /api/admin/orders — List fulfilment orders across all stores
 * (super_admin only, gated by functions/api/admin/_middleware.js).
 * Server-side pagination, search (store name), sort, and
 * status/type/payment filters.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const { limit, offset, search, sort, order } = parseListQuery(url, {
      sortableColumns: new Set([
        "store_name",
        "type",
        "status",
        "amount",
        "requested_at",
        "updated_at",
      ]),
      defaultSort: "requested_at",
      defaultOrder: "DESC",
    });
    const status = url.searchParams.get("status") || "all";
    const type = url.searchParams.get("type") || "all";
    const payment = url.searchParams.get("payment") || "all";

    const where = [];
    const params = [];

    if (search) {
      where.push(String.raw`store_name LIKE ? ESCAPE '\'`);
      params.push(buildLikePattern(search));
    }

    if (status !== "all") {
      where.push("status = ?");
      params.push(status);
    }

    if (type !== "all") {
      where.push("type = ?");
      params.push(type);
    }

    // Payment worklist filters. A free order (amount 0, e.g. an included
    // welcome pack) never counts as owed — there is nothing to collect.
    // 'pending' = still to invoice, 'invoiced' = invoice sent, awaiting
    // payment, 'unpaid' = either of those (the umbrella), 'paid' = settled.
    if (payment === "pending") {
      where.push("paid_at IS NULL AND invoiced_at IS NULL AND amount > 0");
    }
    if (payment === "invoiced") {
      where.push("paid_at IS NULL AND invoiced_at IS NOT NULL AND amount > 0");
    }
    if (payment === "unpaid") where.push("paid_at IS NULL AND amount > 0");
    if (payment === "paid") where.push("(paid_at IS NOT NULL OR amount = 0)");

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const summarySql = `
      WITH summary AS (
        SELECT o.id, o.store_id, s.name AS store_name, o.type, o.status,
               o.amount, o.invoiced_at, o.paid_at, o.requested_at, o.updated_at,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o
        JOIN stores s ON s.id = o.store_id
      )`;

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(
        `${summarySql} SELECT COUNT(*) AS total FROM summary ${whereSql}`,
      ).bind(...params),
      env.DB.prepare(
        `${summarySql} SELECT * FROM summary ${whereSql} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
      ).bind(...params, limit, offset),
    ]);

    const total = countResult.results[0].total;

    return Response.json({
      data: dataResult.results,
      meta: { total, limit, offset },
    });
  } catch (error) {
    const err = new Error("Admin: Failed to list orders");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * POST /api/admin/orders — Record a new fulfilment order (super_admin only).
 * Body: { store_id, type, items: [{ item, quantity }], amount?, notes?,
 * requested_at? }. Orders arrive by email/phone today, so the super_admin
 * records them on the store's behalf.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  if (!body.store_id) {
    return Response.json(
      { error: { message: "Store is required", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const typeError = validateOrderType(body.type);
  if (typeError) return typeError;

  const amountError = validateOrderAmount(body.amount);
  if (amountError) return amountError;

  const itemsError = validateOrderItemsList(body.items);
  if (itemsError) return itemsError;

  try {
    const store = await env.DB.prepare("SELECT id FROM stores WHERE id = ?")
      .bind(body.store_id)
      .first();
    if (!store) {
      return Response.json(
        { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const id = generateUlid();
    const now = new Date().toISOString();
    const requestedAt = normalizeDateInput(body.requested_at) ?? now;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO orders (id, store_id, type, status, amount, notes, requested_at, created_at, updated_at)
         VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        body.store_id,
        body.type ?? "refill",
        body.amount ?? 0,
        (body.notes ?? "").toString().trim(),
        requestedAt,
        now,
        now,
      ),
      ...buildItemsReplace(env, id, body.items),
    ]);

    const order = await getOrderDetail(env, id);

    return Response.json({ data: { order } }, { status: 201 });
  } catch (error) {
    const err = new Error("Admin: Failed to create order");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
