/**
 * Auth + store-scoping gate for /api/vallles/* (the `_middleware.js` chain):
 * session validation, live account status, membership checks, and store
 * status semantics (inactive blocks access, suspended stays readable).
 */

import { describe, expect, it } from "vitest";

import { onRequest as valllesGate } from "../../functions/api/vallles/_middleware.js";
import { onRequestGet as listVallles } from "../../functions/api/vallles/index.js";
import {
  buildRequest,
  runRoute,
  seedStoreWithUser,
  seedVallle,
} from "../_helpers.js";

/** Runs GET /api/vallles through the middleware chain. */
async function listAs({ userId, storeId, headers } = {}) {
  const request = await buildRequest("/api/vallles", {
    userId,
    storeId,
    headers,
  });
  return runRoute([valllesGate, listVallles], request);
}

describe("vallles middleware — authentication", () => {
  it("rejects requests with no session cookie", async () => {
    const { storeId } = await seedStoreWithUser();

    const response = await listAs({ storeId });
    const { error } = await response.json();

    expect(response.status).toBe(401);
    expect(error.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("rejects a token signed with the wrong secret", async () => {
    const { signJwt } = await import("../../functions/api/auth/_helpers.js");
    const { userId, storeId } = await seedStoreWithUser();
    const forged = await signJwt({ sub: userId }, "not-the-real-secret");

    const request = await buildRequest("/api/vallles", {
      storeId,
      headers: { Cookie: `vallle_token=${forged}` },
    });
    const response = await runRoute([valllesGate, listVallles], request);

    expect(response.status).toBe(401);
  });

  it("rejects a valid token when the account has been deactivated", async () => {
    const { userId, storeId } = await seedStoreWithUser({
      user: { status: "inactive" },
    });

    const response = await listAs({ userId, storeId });

    expect(response.status).toBe(401);
  });
});

describe("vallles middleware — store scoping", () => {
  it("requires the X-Store-Id header", async () => {
    const { userId } = await seedStoreWithUser();

    const response = await listAs({ userId });
    const { error } = await response.json();

    expect(response.status).toBe(400);
    expect(error.code).toBe("STORE_MISSING");
  });

  it("denies access to a store the user is not a member of", async () => {
    const { userId } = await seedStoreWithUser();
    const { storeId: otherStoreId } = await seedStoreWithUser();

    const response = await listAs({ userId, storeId: otherStoreId });
    const { error } = await response.json();

    expect(response.status).toBe(403);
    expect(error.code).toBe("STORE_FORBIDDEN");
  });

  it("denies access when the membership is inactive", async () => {
    const { userId, storeId } = await seedStoreWithUser({
      membership: { status: "inactive" },
    });

    const response = await listAs({ userId, storeId });

    expect(response.status).toBe(403);
  });

  it("denies access when the store is inactive", async () => {
    const { userId, storeId } = await seedStoreWithUser({
      store: { status: "inactive" },
    });

    const response = await listAs({ userId, storeId });

    expect(response.status).toBe(403);
  });

  it("keeps a suspended store readable", async () => {
    const { userId, storeId } = await seedStoreWithUser({
      store: { status: "suspended" },
    });
    await seedVallle(storeId, userId);

    const response = await listAs({ userId, storeId });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });

  it("only returns vallles belonging to the active store", async () => {
    const { userId, storeId } = await seedStoreWithUser();
    const { userId: otherUserId, storeId: otherStoreId } =
      await seedStoreWithUser();
    const ownVallleId = await seedVallle(storeId, userId);
    await seedVallle(otherStoreId, otherUserId);

    const response = await listAs({ userId, storeId });
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(ownVallleId);
  });
});
