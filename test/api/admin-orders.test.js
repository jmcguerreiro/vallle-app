/**
 * /api/admin/orders — fulfilment order tracking: super_admin gating via the
 * admin middleware, creation validation (store, type, items), status updates,
 * item replacement, and the atomic mark-as-paid flow.
 */

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { onRequest as adminGate } from "../../functions/api/admin/_middleware.js";
import {
  onRequestGet as getOrder,
  onRequestPatch as markOrder,
  onRequestPut as updateOrder,
} from "../../functions/api/admin/orders/[id].js";
import {
  ORDER_ITEMS as SERVER_ORDER_ITEMS,
  ORDER_STATUSES as SERVER_ORDER_STATUSES,
  ORDER_TYPES as SERVER_ORDER_TYPES,
} from "../../functions/api/admin/orders/_helpers.js";
import { onRequestPost as createOrder } from "../../functions/api/admin/orders/index.js";
import {
  ORDER_ITEMS as CLIENT_ORDER_ITEMS,
  ORDER_STATUSES as CLIENT_ORDER_STATUSES,
  ORDER_TYPES as CLIENT_ORDER_TYPES,
} from "../../src/constants/orders.js";
import {
  buildRequest,
  runRoute,
  seedOrder,
  seedStore,
  seedUser,
} from "../_helpers.js";

/** Runs an admin orders route through the middleware chain. */
async function requestAs(
  handler,
  { userId, method = "GET", path = "/api/admin/orders", body, params } = {},
) {
  const request = await buildRequest(path, { userId, method, body });
  return runRoute([adminGate, handler], request, params);
}

describe("admin orders — access", () => {
  it("rejects a non-super_admin user", async () => {
    const userId = await seedUser({ role: "user" });

    const response = await requestAs(createOrder, { userId, method: "POST" });

    expect(response.status).toBe(403);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await requestAs(createOrder, { method: "POST" });

    expect(response.status).toBe(401);
  });
});

describe("POST /api/admin/orders", () => {
  it("creates an order with its items", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createOrder, {
      userId: adminId,
      method: "POST",
      body: {
        store_id: storeId,
        type: "welcome_pack",
        items: [
          { item: "cards", quantity: 50 },
          { item: "box", quantity: 1 },
        ],
        amount: 0,
        notes: "First delivery",
        requested_at: "2026-07-01",
      },
    });
    const { data } = await response.json();

    expect(response.status).toBe(201);
    expect(data.order.store_id).toBe(storeId);
    expect(data.order.type).toBe("welcome_pack");
    expect(data.order.status).toBe("requested");
    expect(data.order.amount).toBe(0);
    expect(data.order.paid_at).toBeNull();
    expect(data.order.requested_at).toBe("2026-07-01T00:00:00Z");
    expect(data.order.items).toHaveLength(2);

    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM order_items WHERE order_id = ?",
    )
      .bind(data.order.id)
      .first();
    expect(row.count).toBe(2);
  });

  it("rejects an unknown store", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(createOrder, {
      userId: adminId,
      method: "POST",
      body: { store_id: "nope", items: [{ item: "cards", quantity: 50 }] },
    });

    expect(response.status).toBe(404);
  });

  it("rejects an invalid type", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createOrder, {
      userId: adminId,
      method: "POST",
      body: {
        store_id: storeId,
        type: "mystery_box",
        items: [{ item: "cards", quantity: 50 }],
      },
    });

    expect(response.status).toBe(400);
  });

  it("rejects an empty items list", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createOrder, {
      userId: adminId,
      method: "POST",
      body: { store_id: storeId, items: [] },
    });

    expect(response.status).toBe(400);
  });

  it("rejects an item outside the catalogue", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createOrder, {
      userId: adminId,
      method: "POST",
      body: { store_id: storeId, items: [{ item: "stickers", quantity: 5 }] },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a non-positive quantity", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createOrder, {
      userId: adminId,
      method: "POST",
      body: { store_id: storeId, items: [{ item: "cards", quantity: 0 }] },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a negative amount", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createOrder, {
      userId: adminId,
      method: "POST",
      body: {
        store_id: storeId,
        amount: -100,
        items: [{ item: "cards", quantity: 50 }],
      },
    });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/admin/orders/:id", () => {
  it("returns the order with its items and store name", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore({ name: "Loja do Bairro" });
    const orderId = await seedOrder(storeId, {}, [
      { item: "cards", quantity: 50 },
      { item: "envelopes", quantity: 50 },
    ]);

    const response = await requestAs(getOrder, {
      userId: adminId,
      params: { id: orderId },
    });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.order.store_name).toBe("Loja do Bairro");
    expect(data.order.payment_state).toBe("to_invoice");
    expect(data.order.items).toHaveLength(2);
  });

  it("returns 404 for an unknown order", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(getOrder, {
      userId: adminId,
      params: { id: "nope" },
    });

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/admin/orders/:id", () => {
  it("updates the status and replaces the items", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId);

    const response = await requestAs(updateOrder, {
      userId: adminId,
      method: "PUT",
      params: { id: orderId },
      body: {
        status: "shipped",
        items: [{ item: "envelopes", quantity: 25 }],
      },
    });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.order.status).toBe("shipped");
    expect(data.order.items).toHaveLength(1);
    expect(data.order.items[0].item).toBe("envelopes");
  });

  it("rejects an invalid status", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId);

    const response = await requestAs(updateOrder, {
      userId: adminId,
      method: "PUT",
      params: { id: orderId },
      body: { status: "teleported" },
    });

    expect(response.status).toBe(400);
  });

  it("leaves items untouched when they are not in the body", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId, {}, [
      { item: "cards", quantity: 50 },
      { item: "pen", quantity: 1 },
    ]);

    const response = await requestAs(updateOrder, {
      userId: adminId,
      method: "PUT",
      params: { id: orderId },
      body: { status: "preparing" },
    });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.order.items).toHaveLength(2);
  });

  it("sets and clears the invoice date", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId);

    const setResponse = await requestAs(updateOrder, {
      userId: adminId,
      method: "PUT",
      params: { id: orderId },
      body: { invoiced_at: "2026-07-02" },
    });
    const set = await setResponse.json();
    expect(setResponse.status).toBe(200);
    expect(set.data.order.invoiced_at).toBe("2026-07-02T00:00:00Z");

    const clearResponse = await requestAs(updateOrder, {
      userId: adminId,
      method: "PUT",
      params: { id: orderId },
      body: { invoiced_at: "" },
    });
    const cleared = await clearResponse.json();
    expect(clearResponse.status).toBe(200);
    expect(cleared.data.order.invoiced_at).toBeNull();
  });

  it("refuses to clear the invoice date on a paid order", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId, {
      invoiced_at: "2026-07-01T00:00:00Z",
      paid_at: "2026-07-10T00:00:00Z",
    });

    const response = await requestAs(updateOrder, {
      userId: adminId,
      method: "PUT",
      params: { id: orderId },
      body: { invoiced_at: "" },
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown order", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(updateOrder, {
      userId: adminId,
      method: "PUT",
      params: { id: "nope" },
      body: { status: "shipped" },
    });

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/orders/:id — mark invoiced/paid", () => {
  it("marks an invoiced order as paid", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId, {
      invoiced_at: "2026-07-01T00:00:00Z",
    });

    const response = await requestAs(markOrder, {
      userId: adminId,
      method: "PATCH",
      params: { id: orderId },
    });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.order.paid_at).not.toBeNull();
  });

  it("refuses to mark an uninvoiced order as paid", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId);

    const response = await requestAs(markOrder, {
      userId: adminId,
      method: "PATCH",
      params: { id: orderId },
    });
    const { error } = await response.json();

    expect(response.status).toBe(409);
    expect(error.code).toBe("ORDER_NOT_INVOICED");
  });

  it("returns 409 when the order is already paid", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId, {
      invoiced_at: "2026-06-15T00:00:00Z",
      paid_at: "2026-07-01T00:00:00Z",
    });

    const response = await requestAs(markOrder, {
      userId: adminId,
      method: "PATCH",
      params: { id: orderId },
    });
    const { error } = await response.json();

    expect(response.status).toBe(409);
    expect(error.code).toBe("ORDER_ALREADY_PAID");
  });

  it("returns 404 for an unknown order", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(markOrder, {
      userId: adminId,
      method: "PATCH",
      params: { id: "nope" },
    });

    expect(response.status).toBe(404);
  });

  it("marks an order as invoiced without touching paid_at", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId);

    const response = await requestAs(markOrder, {
      userId: adminId,
      method: "PATCH",
      params: { id: orderId },
      body: { mark: "invoiced" },
    });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.order.invoiced_at).not.toBeNull();
    expect(data.order.paid_at).toBeNull();
  });

  it("returns 409 when the order is already invoiced", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId, {
      invoiced_at: "2026-07-01T00:00:00Z",
    });

    const response = await requestAs(markOrder, {
      userId: adminId,
      method: "PATCH",
      params: { id: orderId },
      body: { mark: "invoiced" },
    });
    const { error } = await response.json();

    expect(response.status).toBe(409);
    expect(error.code).toBe("ORDER_ALREADY_INVOICED");
  });

  it("rejects an unknown mark action", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const orderId = await seedOrder(storeId);

    const response = await requestAs(markOrder, {
      userId: adminId,
      method: "PATCH",
      params: { id: orderId },
      body: { mark: "refunded" },
    });

    expect(response.status).toBe(400);
  });
});

describe("catalogue sync", () => {
  // The type/status/item catalogues are hand-mirrored between the API
  // (validation Sets) and the client (src/constants/orders.js). This guard
  // fails the build when someone updates one side and forgets the other.
  it("keeps the server catalogues in sync with src/constants/orders.js", () => {
    expect([...SERVER_ORDER_TYPES].toSorted()).toEqual(
      Object.values(CLIENT_ORDER_TYPES).toSorted(),
    );
    expect([...SERVER_ORDER_STATUSES].toSorted()).toEqual(
      Object.values(CLIENT_ORDER_STATUSES).toSorted(),
    );
    expect([...SERVER_ORDER_ITEMS].toSorted()).toEqual(
      [...CLIENT_ORDER_ITEMS].toSorted(),
    );
  });
});
