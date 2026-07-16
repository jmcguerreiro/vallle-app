/**
 * D1-backed fixed-window rate limiter for the unauthenticated auth endpoints
 * (login, password reset). Cloudflare Pages Functions are stateless, so the
 * counter lives in the `auth_rate_limits` table keyed by "<endpoint>:<client-ip>".
 *
 * Fails open: if the counter read/write throws, the request is allowed through
 * rather than locking users out on a transient DB blip — the handler's own DB
 * access will surface a real outage on its own.
 */

/**
 * Preset limits per endpoint. Windows are deliberately generous enough not to
 * trip a fat-fingering human, tight enough to blunt automated brute force.
 */
export const RATE_LIMITS = {
  LOGIN: { name: "login", limit: 10, windowSeconds: 15 * 60 },
  FORGOT_PASSWORD: {
    name: "forgot-password",
    limit: 5,
    windowSeconds: 15 * 60,
  },
  RESET_PASSWORD: { name: "reset-password", limit: 10, windowSeconds: 15 * 60 },
};

/**
 * Resolves the client IP from Cloudflare's edge headers, falling back to a
 * shared "local" bucket when absent (local dev / tests without the header).
 * @param {Request} request
 * @returns {string}
 */
function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
    "local"
  );
}

/**
 * Enforces a fixed-window rate limit for a named bucket + client IP. Returns a
 * 429 Response when the limit is exceeded, or null when the request may proceed
 * — mirroring the return-Response-or-value convention of requireAuth/requireStore.
 * @param {Object} env - Cloudflare env bindings (DB)
 * @param {Request} request
 * @param {Object} options
 * @param {string} options.name - Bucket name, e.g. "login"
 * @param {number} options.limit - Max attempts allowed within the window
 * @param {number} options.windowSeconds - Window length in seconds
 * @returns {Promise<Response|null>}
 */
export async function enforceRateLimit(
  env,
  request,
  { name, limit, windowSeconds },
) {
  const bucket = `${name}:${clientIp(request)}`;
  const now = new Date();
  const nowIso = now.toISOString();
  // A bucket whose window started at/before this cutoff has expired and resets.
  // ISO-to-ISO string comparison sorts correctly (same fixed-width UTC format).
  const cutoffIso = new Date(
    now.getTime() - windowSeconds * 1000,
  ).toISOString();

  let count;
  try {
    // Atomic upsert: start a fresh window when the stored one has expired,
    // otherwise increment. RETURNING gives us the post-write count in one round trip.
    const row = await env.DB.prepare(
      `INSERT INTO auth_rate_limits (bucket, count, window_start)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket) DO UPDATE SET
         count = CASE WHEN auth_rate_limits.window_start <= ? THEN 1
                      ELSE auth_rate_limits.count + 1 END,
         window_start = CASE WHEN auth_rate_limits.window_start <= ? THEN ?
                             ELSE auth_rate_limits.window_start END
       RETURNING count`,
    )
      .bind(bucket, nowIso, cutoffIso, cutoffIso, nowIso)
      .first();
    count = row?.count ?? 0;
  } catch {
    return null; // Fail open — never lock users out because the limiter failed.
  }

  if (count > limit) {
    return Response.json(
      {
        error: {
          message: "Too many attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
      },
      { status: 429, headers: { "Retry-After": String(windowSeconds) } },
    );
  }

  return null;
}
