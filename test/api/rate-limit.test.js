/**
 * Rate limiter: fixed-window counting, per-IP isolation, window reset, and the
 * wiring into POST /api/auth/login.
 */

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { enforceRateLimit } from "../../functions/api/_rate-limit.js";
import { onRequestPost as login } from "../../functions/api/auth/login.js";

/** Builds a bare Request carrying a client IP header the limiter keys on. */
function requestFrom(ip, { body } = {}) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "CF-Connecting-IP": ip,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("enforceRateLimit", () => {
  const limit = 3;
  const windowSeconds = 900;

  it("allows up to the limit, then blocks with 429 + Retry-After", async () => {
    const opts = { name: "test", limit, windowSeconds };

    for (let i = 0; i < limit; i++) {
      const result = await enforceRateLimit(env, requestFrom("10.0.0.1"), opts);
      expect(result).toBeNull();
    }

    const blocked = await enforceRateLimit(env, requestFrom("10.0.0.1"), opts);
    expect(blocked).toBeInstanceOf(Response);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe(String(windowSeconds));

    const { error } = await blocked.json();
    expect(error.code).toBe("RATE_LIMITED");
  });

  it("keeps a separate counter per client IP", async () => {
    const opts = { name: "isolation", limit: 1, windowSeconds };

    // Exhaust IP A.
    expect(
      await enforceRateLimit(env, requestFrom("10.0.0.2"), opts),
    ).toBeNull();
    expect(
      (await enforceRateLimit(env, requestFrom("10.0.0.2"), opts)).status,
    ).toBe(429);

    // IP B is unaffected.
    expect(
      await enforceRateLimit(env, requestFrom("10.0.0.3"), opts),
    ).toBeNull();
  });

  it("resets once the window has elapsed", async () => {
    const opts = { name: "reset", limit: 1, windowSeconds };
    const bucket = `${opts.name}:10.0.0.4`;

    // Pre-seed an exhausted bucket whose window started well in the past.
    await env.DB.prepare(
      "INSERT INTO auth_rate_limits (bucket, count, window_start) VALUES (?, ?, ?)",
    )
      .bind(bucket, 99, "2000-01-01T00:00:00.000Z")
      .run();

    // The stale window is expired, so the next attempt starts fresh.
    expect(
      await enforceRateLimit(env, requestFrom("10.0.0.4"), opts),
    ).toBeNull();
  });
});

describe("POST /api/auth/login — rate limiting", () => {
  it("returns 429 once the login limit is exceeded for an IP", async () => {
    // LOGIN preset allows 10 per window; the 11th attempt from one IP is blocked.
    let lastStatus;
    for (let i = 0; i < 11; i++) {
      const response = await login({
        env,
        request: requestFrom("10.9.9.9", {
          body: { email: "nobody@test.local", password: "wrong" },
        }),
      });
      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);
  });
});
