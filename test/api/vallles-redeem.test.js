/**
 * POST /api/vallles/:id/redeem — the money path. Balance arithmetic (integer
 * cents), full-redemption status flip, expiry/status/balance guards, and
 * store isolation. Runs through the real vallles middleware chain.
 */

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { onRequestPost as redeemVallle } from "../../functions/api/vallles/[id]/redeem.js";
import { onRequest as valllesGate } from "../../functions/api/vallles/_middleware.js";
import {
  PAST,
  buildRequest,
  runRoute,
  seedStoreWithUser,
  seedVallle,
} from "../_helpers.js";

/** A valid redemption body for tests that exercise other guards. */
const VALID_BODY = { amount: 1000, description: "Coffee and cake" };

/** Runs POST /api/vallles/:id/redeem through the middleware chain. */
async function redeemAs({ userId, storeId }, vallleId, body) {
  const request = await buildRequest(`/api/vallles/${vallleId}/redeem`, {
    userId,
    storeId,
    method: "POST",
    body,
  });
  return runRoute([valllesGate, redeemVallle], request, { id: vallleId });
}

describe("redeem — balance arithmetic", () => {
  it("deducts a partial redemption and records it", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId, {
      amount: 5000,
    });

    const response = await redeemAs(session, vallleId, {
      amount: 2000,
      description: "Lunch",
    });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.amount).toBe(2000);
    expect(data.balance_after).toBe(3000);

    const vallle = await env.DB.prepare("SELECT * FROM vallles WHERE id = ?")
      .bind(vallleId)
      .first();
    expect(vallle.balance).toBe(3000);
    expect(vallle.status).toBe("active");

    const redemption = await env.DB.prepare(
      "SELECT * FROM redemptions WHERE vallle_id = ?",
    )
      .bind(vallleId)
      .first();
    expect(redemption.amount).toBe(2000);
    expect(redemption.balance_after).toBe(3000);
    expect(redemption.redeemed_by).toBe(session.userId);
    expect(redemption.store_id).toBe(session.storeId);
  });

  it("marks the vallle as used when the balance reaches zero", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId, {
      amount: 5000,
    });

    const response = await redeemAs(session, vallleId, {
      amount: 5000,
      description: "Full redemption",
    });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.balance_after).toBe(0);

    const vallle = await env.DB.prepare(
      "SELECT balance, status FROM vallles WHERE id = ?",
    )
      .bind(vallleId)
      .first();
    expect(vallle.balance).toBe(0);
    expect(vallle.status).toBe("used");
  });

  it("accumulates sequential redemptions and rejects overdraw of the remainder", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId, {
      amount: 5000,
    });

    const first = await redeemAs(session, vallleId, {
      amount: 3000,
      description: "First visit",
    });
    expect(first.status).toBe(200);

    const second = await redeemAs(session, vallleId, {
      amount: 2500,
      description: "Second visit",
    });
    const { error } = await second.json();

    expect(second.status).toBe(400);
    expect(error.code).toBe("VALLLE_INSUFFICIENT_BALANCE");

    const vallle = await env.DB.prepare(
      "SELECT balance FROM vallles WHERE id = ?",
    )
      .bind(vallleId)
      .first();
    expect(vallle.balance).toBe(2000);
  });

  it("rejects a redemption larger than the balance", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId, {
      amount: 5000,
    });

    const response = await redeemAs(session, vallleId, {
      amount: 5001,
      description: "Too much",
    });
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("VALLLE_INSUFFICIENT_BALANCE");
  });
});

describe("redeem — vallle state guards", () => {
  it("rejects an expired vallle", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId, {
      expires_at: PAST,
    });

    const response = await redeemAs(session, vallleId, VALID_BODY);
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("VALLLE_EXPIRED");
  });

  it("rejects a non-active vallle", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId, {
      status: "archived",
    });

    const response = await redeemAs(session, vallleId, VALID_BODY);
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("VALLLE_INACTIVE");
  });

  it("returns 404 for a vallle belonging to another store", async () => {
    const session = await seedStoreWithUser();
    const other = await seedStoreWithUser();
    const foreignVallleId = await seedVallle(other.storeId, other.userId);

    const response = await redeemAs(session, foreignVallleId, VALID_BODY);
    const { error } = await response.json();

    expect(response.status).toBe(404);
    expect(error.code).toBe("VALLLE_NOT_FOUND");
  });
});

describe("redeem — input validation", () => {
  const invalidAmounts = [0, -100, 20.5, 5_000_001, "2000", null];

  for (const amount of invalidAmounts) {
    it(`rejects amount ${JSON.stringify(amount)}`, async () => {
      const session = await seedStoreWithUser();
      const vallleId = await seedVallle(session.storeId, session.userId);

      const response = await redeemAs(session, vallleId, {
        amount,
        description: "Invalid amount",
      });
      const { error } = await response.json();

      expect(response.status).toBe(400);
      expect(error.code).toBe("VALIDATION_FAILED");
    });
  }

  it("requires a non-empty description", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId);

    const response = await redeemAs(session, vallleId, {
      amount: 1000,
      description: "   ",
    });
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects a malformed JSON body", async () => {
    const session = await seedStoreWithUser();
    const vallleId = await seedVallle(session.storeId, session.userId);

    const response = await redeemAs(session, vallleId, "{not json");
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("VALIDATION_FAILED");
  });
});
