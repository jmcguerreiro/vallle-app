/**
 * POST /api/vallles — creation rules: balance starts at the full amount,
 * expiry and minimum-redemption defaults are snapshotted from the store,
 * suspended stores can't emit, and money validation holds at the boundaries.
 */

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { onRequest as valllesGate } from "../../functions/api/vallles/_middleware.js";
import { onRequestPost as createVallle } from "../../functions/api/vallles/index.js";
import {
  PAST,
  buildRequest,
  runRoute,
  seedStoreWithUser,
} from "../_helpers.js";

const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/** Runs POST /api/vallles through the middleware chain. */
async function createAs({ userId, storeId }, body) {
  const request = await buildRequest("/api/vallles", {
    userId,
    storeId,
    method: "POST",
    body,
  });
  return runRoute([valllesGate, createVallle], request);
}

describe("create vallle", () => {
  it("creates a vallle with the balance equal to the amount", async () => {
    const session = await seedStoreWithUser();

    const response = await createAs(session, {
      amount: 7500,
      buyer: "Maria Silva",
    });
    const { data } = await response.json();

    expect(response.status).toBe(201);
    expect(data.amount).toBe(7500);
    expect(data.balance).toBe(7500);
    expect(data.status).toBe("active");
    expect(data.code).toMatch(CODE_PATTERN);

    const row = await env.DB.prepare("SELECT * FROM vallles WHERE id = ?")
      .bind(data.id)
      .first();
    expect(row.balance).toBe(7500);
    expect(row.store_id).toBe(session.storeId);
    expect(row.created_by).toBe(session.userId);
  });

  it("creates a vallle without a buyer", async () => {
    const session = await seedStoreWithUser();

    const response = await createAs(session, { amount: 2500 });

    expect(response.status).toBe(201);
  });

  it("defaults the expiry from the store's expiry period", async () => {
    const session = await seedStoreWithUser({
      store: { default_vallle_expiry_days: 30 },
    });

    const response = await createAs(session, { amount: 2500 });
    const { data } = await response.json();

    expect(response.status).toBe(201);
    const daysUntilExpiry =
      (new Date(data.expires_at) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysUntilExpiry).toBeGreaterThan(29);
    expect(daysUntilExpiry).toBeLessThanOrEqual(30);
  });

  it("snapshots the store's minimum-redemption defaults", async () => {
    const session = await seedStoreWithUser({
      store: {
        default_min_redemption_mode: "custom",
        default_min_redemption_cents: 1000,
      },
    });

    const response = await createAs(session, { amount: 2500 });
    const { data } = await response.json();

    expect(response.status).toBe(201);
    expect(data.min_redemption_mode).toBe("custom");
    expect(data.min_redemption_cents).toBe(1000);
  });

  it("rejects a custom minimum-redemption override without an amount", async () => {
    const session = await seedStoreWithUser();

    const response = await createAs(session, {
      amount: 2500,
      min_redemption_mode: "custom",
    });
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("VALIDATION_FAILED");
  });

  it("blocks creation for a suspended store", async () => {
    const session = await seedStoreWithUser({
      store: { status: "suspended" },
    });

    const response = await createAs(session, { amount: 2500 });
    const { error } = await response.json();

    expect(response.status).toBe(403);
    expect(error.code).toBe("STORE_SUSPENDED");
  });

  it("rejects an expiry date in the past", async () => {
    const session = await seedStoreWithUser();

    const response = await createAs(session, {
      amount: 2500,
      expires_at: PAST,
    });
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("VALIDATION_FAILED");
  });

  it("accepts the maximum amount and rejects one cent above it", async () => {
    const session = await seedStoreWithUser();

    const atLimit = await createAs(session, { amount: 5_000_000 });
    expect(atLimit.status).toBe(201);

    const overLimit = await createAs(session, { amount: 5_000_001 });
    const { error } = await overLimit.json();
    expect(overLimit.status).toBe(400);
    expect(error.code).toBe("VALIDATION_FAILED");
  });
});
