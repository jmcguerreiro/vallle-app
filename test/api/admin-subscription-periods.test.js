/**
 * /api/admin/subscriptions/periods — the subscription-period ledger:
 * super_admin gating, creation (renewals with the anniversary rule),
 * validation boundaries, the vallles_sold snapshot, store plan/renewal-date
 * syncing, the first-period flag, editing (including clearing paid_at), the
 * atomic mark-as-paid flow, and unpaid-only deletion.
 */

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { onRequest as adminGate } from "../../functions/api/admin/_middleware.js";
import {
  onRequestGet as getPeriodRoute,
  onRequestDelete as deletePeriod,
  onRequestPatch as markPaid,
  onRequestPut as updatePeriod,
} from "../../functions/api/admin/subscriptions/periods/[id].js";
import { onRequestPost as createPeriod } from "../../functions/api/admin/subscriptions/periods/index.js";
import {
  buildRequest,
  runRoute,
  seedPeriod,
  seedStore,
  seedUser,
  seedVallle,
} from "../_helpers.js";

/** Runs a subscription-period route through the admin middleware chain. */
async function requestAs(
  handler,
  {
    userId,
    method = "GET",
    path = "/api/admin/subscriptions/periods",
    body,
    params,
  } = {},
) {
  const request = await buildRequest(path, { userId, method, body });
  return runRoute([adminGate, handler], request, params);
}

/** Reads a store row directly (plan/plan_renews_at sync assertions). */
async function getStore(storeId) {
  return env.DB.prepare("SELECT plan, plan_renews_at FROM stores WHERE id = ?")
    .bind(storeId)
    .first();
}

const VALID_BODY = {
  plan: "growth",
  period_start: "2026-03-01",
  period_end: "2027-03-01",
  amount: 15_588,
};

describe("subscription periods — access", () => {
  it("rejects a non-super_admin user", async () => {
    const userId = await seedUser({ role: "user" });
    const storeId = await seedStore();

    const response = await requestAs(createPeriod, {
      userId,
      method: "POST",
      body: { ...VALID_BODY, store_id: storeId },
    });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/subscriptions/periods", () => {
  it("creates a period and syncs the store's plan and renewal date", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createPeriod, {
      userId: adminId,
      method: "POST",
      body: {
        ...VALID_BODY,
        store_id: storeId,
        paid_at: "2026-02-20",
        notes: "Paid early",
      },
    });

    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.period.plan).toBe("growth");
    expect(data.period.period_start).toBe("2026-03-01T00:00:00Z");
    expect(data.period.period_end).toBe("2027-03-01T00:00:00Z");
    expect(data.period.amount).toBe(15_588);
    expect(data.period.paid_at).toBe("2026-02-20T00:00:00Z");
    expect(data.period.notes).toBe("Paid early");

    const store = await getStore(storeId);
    expect(store.plan).toBe("growth");
    expect(store.plan_renews_at).toBe("2027-03-01T00:00:00Z");
  });

  it("snapshots vallles_sold from the year before the period start", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    // Fixtures are created at 2026-01-01 — inside the trailing year of a
    // 2026-03-01 period start, outside a period starting 2027-06-01.
    await seedVallle(storeId, adminId);
    await seedVallle(storeId, adminId);

    const inWindow = await requestAs(createPeriod, {
      userId: adminId,
      method: "POST",
      // Paid so the second period below (a renewal) clears the unpaid guard.
      body: { ...VALID_BODY, store_id: storeId, paid_at: "2026-02-20" },
    });
    const { data: inData } = await inWindow.json();
    expect(inData.period.vallles_sold).toBe(2);

    const outOfWindow = await requestAs(createPeriod, {
      userId: adminId,
      method: "POST",
      body: {
        ...VALID_BODY,
        store_id: storeId,
        period_start: "2027-06-01",
        period_end: "2028-06-01",
      },
    });
    const { data: outData } = await outOfWindow.json();
    expect(outData.period.vallles_sold).toBe(0);
  });

  it("rejects a period that ends before it starts", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    const response = await requestAs(createPeriod, {
      userId: adminId,
      method: "POST",
      body: {
        ...VALID_BODY,
        store_id: storeId,
        period_start: "2027-03-01",
        period_end: "2026-03-01",
      },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a missing store, an invalid plan, and a negative or fractional amount", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();

    for (const body of [
      { ...VALID_BODY },
      { ...VALID_BODY, store_id: storeId, plan: "platinum" },
      { ...VALID_BODY, store_id: storeId, amount: -1 },
      { ...VALID_BODY, store_id: storeId, amount: 59.88 },
      {
        store_id: storeId,
        plan: "growth",
        period_start: "2026-03-01",
        period_end: "2027-03-01",
      },
    ]) {
      const response = await requestAs(createPeriod, {
        userId: adminId,
        method: "POST",
        body,
      });
      expect(response.status).toBe(400);
    }
  });

  it("404s for an unknown store", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(createPeriod, {
      userId: adminId,
      method: "POST",
      body: { ...VALID_BODY, store_id: "nope" },
    });

    expect(response.status).toBe(404);
  });

  it("409s when renewing while the latest period is unpaid", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    await seedPeriod(storeId, {
      period_start: "2025-03-01T00:00:00Z",
      period_end: "2026-03-01T00:00:00Z",
      paid_at: null,
    });

    const response = await requestAs(createPeriod, {
      userId: adminId,
      method: "POST",
      body: { ...VALID_BODY, store_id: storeId },
    });

    expect(response.status).toBe(409);
    const { error } = await response.json();
    expect(error.code).toBe("SUBSCRIPTION_UNPAID");
  });

  it("allows renewing once the latest period is paid", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    await seedPeriod(storeId, {
      period_start: "2025-03-01T00:00:00Z",
      period_end: "2026-03-01T00:00:00Z",
      paid_at: "2025-03-05T00:00:00Z",
    });

    const response = await requestAs(createPeriod, {
      userId: adminId,
      method: "POST",
      body: { ...VALID_BODY, store_id: storeId },
    });

    expect(response.status).toBe(201);
  });
});

describe("GET /api/admin/subscriptions/periods/:id", () => {
  it("returns the period with its store name", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore({ name: "Loja Única" });
    const periodId = await seedPeriod(storeId, { notes: "First year" });

    const response = await requestAs(getPeriodRoute, {
      userId: adminId,
      params: { id: periodId },
    });

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.period.store_name).toBe("Loja Única");
    expect(data.period.notes).toBe("First year");
  });

  it("flags only the store's earliest period as first", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const firstId = await seedPeriod(storeId, {
      period_start: "2024-01-01T00:00:00Z",
      period_end: "2025-01-01T00:00:00Z",
    });
    const renewalId = await seedPeriod(storeId);

    const first = await requestAs(getPeriodRoute, {
      userId: adminId,
      params: { id: firstId },
    });
    const { data: firstData } = await first.json();
    expect(firstData.is_first).toBe(true);

    const renewal = await requestAs(getPeriodRoute, {
      userId: adminId,
      params: { id: renewalId },
    });
    const { data: renewalData } = await renewal.json();
    expect(renewalData.is_first).toBe(false);
  });

  it("404s for an unknown period", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(getPeriodRoute, {
      userId: adminId,
      params: { id: "nope" },
    });

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/subscriptions/periods/:id (mark as paid)", () => {
  it("marks an unpaid period as paid", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const periodId = await seedPeriod(storeId);

    const response = await requestAs(markPaid, {
      userId: adminId,
      method: "PATCH",
      body: {},
      params: { id: periodId },
    });

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.paid_at).toBeTruthy();
  });

  it("409s when the period is already paid", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const periodId = await seedPeriod(storeId, {
      paid_at: "2025-02-01T00:00:00Z",
    });

    const response = await requestAs(markPaid, {
      userId: adminId,
      method: "PATCH",
      body: {},
      params: { id: periodId },
    });

    expect(response.status).toBe(409);
  });
});

describe("PUT /api/admin/subscriptions/periods/:id", () => {
  it("updates dates, amount, and notes, and re-syncs the store", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const periodId = await seedPeriod(storeId, { plan: "growth" });

    const response = await requestAs(updatePeriod, {
      userId: adminId,
      method: "PUT",
      body: {
        period_start: "2025-02-01",
        period_end: "2026-02-01",
        amount: 100,
        notes: "Adjusted start",
      },
      params: { id: periodId },
    });

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.period.period_start).toBe("2025-02-01T00:00:00Z");
    expect(data.period.amount).toBe(100);
    expect(data.period.notes).toBe("Adjusted start");

    const store = await getStore(storeId);
    expect(store.plan).toBe("growth");
    expect(store.plan_renews_at).toBe("2026-02-01T00:00:00Z");
  });

  it("backfills and clears the paid date", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const periodId = await seedPeriod(storeId);

    const backfill = await requestAs(updatePeriod, {
      userId: adminId,
      method: "PUT",
      body: { paid_at: "2025-01-15" },
      params: { id: periodId },
    });
    const { data: paid } = await backfill.json();
    expect(paid.period.paid_at).toBe("2025-01-15T00:00:00Z");

    const clear = await requestAs(updatePeriod, {
      userId: adminId,
      method: "PUT",
      body: { paid_at: "" },
      params: { id: periodId },
    });
    const { data: unpaid } = await clear.json();
    expect(unpaid.period.paid_at).toBeNull();
  });

  it("rejects moving one end of the period across the other", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const periodId = await seedPeriod(storeId);

    // period_end stays 2026-01-01 — the new start crosses it.
    const response = await requestAs(updatePeriod, {
      userId: adminId,
      method: "PUT",
      body: { period_start: "2026-06-01" },
      params: { id: periodId },
    });

    expect(response.status).toBe(400);
  });

  it("404s for an unknown period", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(updatePeriod, {
      userId: adminId,
      method: "PUT",
      body: { amount: 100 },
      params: { id: "nope" },
    });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/admin/subscriptions/periods/:id", () => {
  it("deletes an unpaid period and re-syncs the store to the previous one", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    await seedPeriod(storeId, {
      plan: "starter",
      period_start: "2025-01-01T00:00:00Z",
      period_end: "2026-01-01T00:00:00Z",
      paid_at: "2025-01-05T00:00:00Z",
    });
    const renewalId = await seedPeriod(storeId, {
      plan: "growth",
      period_start: "2026-01-01T00:00:00Z",
      period_end: "2027-01-01T00:00:00Z",
    });

    const response = await requestAs(deletePeriod, {
      userId: adminId,
      method: "DELETE",
      params: { id: renewalId },
    });

    expect(response.status).toBe(200);
    const remaining = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM subscription_periods WHERE store_id = ?",
    )
      .bind(storeId)
      .first();
    expect(remaining.count).toBe(1);

    const store = await getStore(storeId);
    expect(store.plan).toBe("starter");
    expect(store.plan_renews_at).toBe("2026-01-01T00:00:00Z");
  });

  it("refuses to delete a paid period", async () => {
    const adminId = await seedUser({ role: "super_admin" });
    const storeId = await seedStore();
    const periodId = await seedPeriod(storeId, {
      paid_at: "2025-02-01T00:00:00Z",
    });

    const response = await requestAs(deletePeriod, {
      userId: adminId,
      method: "DELETE",
      params: { id: periodId },
    });

    expect(response.status).toBe(409);
  });

  it("404s for an unknown period", async () => {
    const adminId = await seedUser({ role: "super_admin" });

    const response = await requestAs(deletePeriod, {
      userId: adminId,
      method: "DELETE",
      params: { id: "nope" },
    });

    expect(response.status).toBe(404);
  });
});
