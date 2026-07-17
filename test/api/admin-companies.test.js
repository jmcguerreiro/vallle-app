/**
 * /api/admin/companies/:id — the company detail payload that drives the
 * company modal and its subscription/orders manage modals: subscription
 * periods ordered newest-first and the derived payment_state on every
 * fulfilment order (the pending-orders worklist filters on it client-side).
 */

import { describe, expect, it } from "vitest";

import { onRequest as adminGate } from "../../functions/api/admin/_middleware.js";
import { onRequestGet as getCompany } from "../../functions/api/admin/companies/[id].js";
import {
  buildRequest,
  runRoute,
  seedOrder,
  seedPeriod,
  seedStore,
  seedUser,
} from "../_helpers.js";

/** Runs the company detail route through the admin middleware chain. */
async function requestAs({ userId, params } = {}) {
  const request = await buildRequest("/api/admin/companies", { userId });
  return runRoute([adminGate, getCompany], request, params);
}

describe("GET /api/admin/companies/:id", () => {
  it("returns periods newest-first and a payment_state on every order", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const firstPeriodId = await seedPeriod(storeId, {
      period_start: "2024-01-01T00:00:00Z",
      period_end: "2025-01-01T00:00:00Z",
    });
    const currentPeriodId = await seedPeriod(storeId);
    const paidId = await seedOrder(storeId, {
      amount: 2500,
      invoiced_at: "2026-06-15T00:00:00Z",
      paid_at: "2026-07-01T00:00:00Z",
    });
    const toInvoiceId = await seedOrder(storeId, { amount: 2500 });
    const includedId = await seedOrder(storeId, {
      amount: 0,
      type: "welcome_pack",
    });

    const response = await requestAs({
      userId: adminId,
      params: { id: storeId },
    });

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.subscription.periods.map((p) => p.id)).toEqual([
      currentPeriodId,
      firstPeriodId,
    ]);

    const paymentStates = Object.fromEntries(
      data.orders.map((order) => [order.id, order.payment_state]),
    );
    expect(paymentStates[paidId]).toBe("paid");
    expect(paymentStates[toInvoiceId]).toBe("to_invoice");
    expect(paymentStates[includedId]).toBe("included");
  });

  it("404s for an unknown company", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs({
      userId: adminId,
      params: { id: "nope" },
    });

    expect(response.status).toBe(404);
  });
});
