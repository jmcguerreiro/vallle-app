/**
 * Shared auth helpers for Pages Functions.
 * Uses Web Crypto API (available in Cloudflare Workers) for JWT signing/verification.
 * Passwords are hashed with PBKDF2-SHA256.
 */

const JWT_EXPIRY = 3 * 24 * 60 * 60; // 3 days in seconds

// Iteration count for new password hashes. Stored inside each hash so it can be
// raised over time without locking out existing users. Capped at 100,000:
// Cloudflare Workers' Web Crypto throws NotSupportedError for PBKDF2 above that.
const PBKDF2_ITERATIONS = 100_000;
// Hashes written before the count was stored use this legacy value (2-part
// `salt:hash` format). They still verify, and are silently invisible to new code.
const LEGACY_PBKDF2_ITERATIONS = 100_000;

/**
 * Hashes a raw string with SHA-256 and returns the hex digest. Used for reset
 * tokens — `forgot-password` stores this hash, `reset-password` recomputes it to
 * compare, so both paths must derive it identically.
 * @param {string} raw
 * @returns {Promise<string>} Hex-encoded SHA-256 digest
 */
export async function sha256Hex(raw) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts an ArrayBuffer to a base64url string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/**
 * Converts a base64url string to an ArrayBuffer.
 * @param {string} base64url
 * @returns {ArrayBuffer}
 */
function base64UrlToBuffer(base64url) {
  const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.codePointAt(index);
  }
  return bytes.buffer;
}

/**
 * Gets the HMAC-SHA256 signing key from the JWT_SECRET env var.
 * @param {string} secret
 * @returns {Promise<CryptoKey>}
 */
async function getSigningKey(secret) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Signs a JWT with HMAC-SHA256.
 * @param {Object} payload - JWT claims (sub, role, etc.)
 * @param {string} secret - JWT_SECRET from env
 * @returns {Promise<string>} Signed JWT string
 */
export async function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + JWT_EXPIRY };

  const encoder = new TextEncoder();
  const headerB64 = bufferToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = bufferToBase64Url(encoder.encode(JSON.stringify(claims)));
  const data = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  return `${data}.${bufferToBase64Url(signature)}`;
}

/**
 * Verifies and decodes a JWT.
 * @param {string} token - JWT string
 * @param {string} secret - JWT_SECRET from env
 * @returns {Promise<Object|null>} Decoded payload, or null if invalid/expired
 */
export async function verifyJwt(token, secret) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const data = `${headerB64}.${payloadB64}`;
    const key = await getSigningKey(secret);
    const signature = base64UrlToBuffer(signatureB64);

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(data),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBuffer(payloadB64)),
    );

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Converts a hex string to a byte array.
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  return new Uint8Array(
    hex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)),
  );
}

/**
 * Converts a byte array (or ArrayBuffer) to a hex string.
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derives a 256-bit PBKDF2-SHA256 hash and returns it as hex.
 * @param {string} password
 * @param {Uint8Array} saltBuffer
 * @param {number} iterations
 * @returns {Promise<string>} Hex-encoded derived key
 */
async function deriveHashHex(password, saltBuffer, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );

  return bytesToHex(derivedBits);
}

/**
 * Constant-time comparison of two hex strings. Returns false (without leaking
 * timing) when lengths differ.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.codePointAt(i) ^ b.codePointAt(i);
  }
  return result === 0;
}

/**
 * Hashes a password with PBKDF2-SHA256 using the current iteration count.
 * @param {string} password
 * @returns {Promise<string>} Self-describing format: `iterations:salt:hash`
 */
export async function hashPassword(password) {
  const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await deriveHashHex(password, saltBuffer, PBKDF2_ITERATIONS);
  return `${PBKDF2_ITERATIONS}:${bytesToHex(saltBuffer)}:${hashHex}`;
}

/**
 * Verifies a password against a stored hash. Accepts the self-describing
 * `iterations:salt:hash` format as well as legacy 2-part `salt:hash` hashes
 * (assumed to use {@link LEGACY_PBKDF2_ITERATIONS}).
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  const parts = storedHash.split(":");

  let iterations;
  let salt;
  let expectedHash;
  if (parts.length === 3) {
    iterations = Number.parseInt(parts[0], 10);
    [, salt, expectedHash] = parts;
  } else {
    iterations = LEGACY_PBKDF2_ITERATIONS;
    [salt, expectedHash] = parts;
  }

  const actualHash = await deriveHashHex(password, hexToBytes(salt), iterations);
  return timingSafeEqualHex(actualHash, expectedHash);
}

/**
 * Extracts and verifies the JWT from the request's auth cookie.
 * @param {Request} request
 * @param {string} secret - JWT_SECRET from env
 * @returns {Promise<Object|null>} User payload or null
 */
export async function getAuthUser(request, secret) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)vallle_token=([^;]+)/);
  if (!match) return null;
  return verifyJwt(match[1], secret);
}

/**
 * Verifies the request is authenticated and the account is still active.
 * Re-reads `status` and `role` from the database rather than trusting the
 * (up to 3-day-old) JWT claims, so a deactivated account or a changed role
 * takes effect immediately instead of lingering until the token expires.
 * Returns a 401 Response if not, or `{ user }` (token payload with the live
 * `role`/`status`) if successful.
 * @param {Request} request
 * @param {Object} env - Cloudflare env bindings (DB + JWT_SECRET)
 * @returns {Promise<{ user: Object }|Response>}
 */
export async function requireAuth(request, env) {
  const unauthorized = Response.json(
    { error: { message: "Unauthorized", code: "AUTH_UNAUTHORIZED" } },
    { status: 401 },
  );

  const payload = await getAuthUser(request, env.JWT_SECRET);
  if (!payload) return unauthorized;

  const account = await env.DB.prepare(
    "SELECT status, role FROM users WHERE id = ?",
  )
    .bind(payload.sub)
    .first();

  if (!account || account.status !== "active") return unauthorized;

  return { user: { ...payload, role: account.role, status: account.status } };
}

/**
 * Verifies the request is authenticated and the user has one of the given roles.
 * Role is taken from the live DB record (via requireAuth), not the token.
 * Returns a 401/403 Response if not, or `{ user }` if successful.
 * @param {Request} request
 * @param {Object} env - Cloudflare env bindings (DB + JWT_SECRET)
 * @param {string|string[]} roles - Required role, or list of allowed roles
 * @returns {Promise<{ user: Object }|Response>}
 */
export async function requireRole(request, env, roles) {
  const result = await requireAuth(request, env);
  if (result instanceof Response) return result;
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(result.user.role)) {
    return Response.json(
      { error: { message: "Forbidden", code: "AUTH_FORBIDDEN" } },
      { status: 403 },
    );
  }
  return result;
}

/**
 * Creates a Set-Cookie header for the auth token.
 * @param {string} token
 * @param {boolean} [secure=true] - Whether to set the Secure flag (disable for local dev over HTTP)
 * @returns {string}
 */
export function authCookie(token, secure = true) {
  const secureFlag = secure ? "; Secure" : "";
  return `vallle_token=${token}; Path=/; HttpOnly; SameSite=Strict${secureFlag}; Max-Age=${JWT_EXPIRY}`;
}

/**
 * Creates a Set-Cookie header that clears the auth token.
 * @param {boolean} [secure=true] - Whether to set the Secure flag (disable for local dev over HTTP)
 * @returns {string}
 */
export function clearAuthCookie(secure = true) {
  const secureFlag = secure ? "; Secure" : "";
  return `vallle_token=; Path=/; HttpOnly; SameSite=Strict${secureFlag}; Max-Age=0`;
}
