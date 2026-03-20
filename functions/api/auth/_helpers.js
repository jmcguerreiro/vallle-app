/**
 * Shared auth helpers for Pages Functions.
 * Uses Web Crypto API (available in Cloudflare Workers) for JWT signing/verification.
 * Passwords are hashed with PBKDF2-SHA256.
 */

const JWT_EXPIRY = 7 * 24 * 60 * 60 // 7 days in seconds
const PBKDF2_ITERATIONS = 100_000

/**
 * Converts an ArrayBuffer to a base64url string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/**
 * Converts a base64url string to an ArrayBuffer.
 * @param {string} base64url
 * @returns {ArrayBuffer}
 */
function base64UrlToBuffer(base64url) {
  const base64 = base64url.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.codePointAt(index)
  }
  return bytes.buffer
}

/**
 * Gets the HMAC-SHA256 signing key from the JWT_SECRET env var.
 * @param {string} secret
 * @returns {Promise<CryptoKey>}
 */
async function getSigningKey(secret) {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/**
 * Signs a JWT with HMAC-SHA256.
 * @param {Object} payload - JWT claims (sub, role, etc.)
 * @param {string} secret - JWT_SECRET from env
 * @returns {Promise<string>} Signed JWT string
 */
export async function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claims = { ...payload, iat: now, exp: now + JWT_EXPIRY }

  const encoder = new TextEncoder()
  const headerB64 = bufferToBase64Url(encoder.encode(JSON.stringify(header)))
  const payloadB64 = bufferToBase64Url(encoder.encode(JSON.stringify(claims)))
  const data = `${headerB64}.${payloadB64}`

  const key = await getSigningKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))

  return `${data}.${bufferToBase64Url(signature)}`
}

/**
 * Verifies and decodes a JWT.
 * @param {string} token - JWT string
 * @param {string} secret - JWT_SECRET from env
 * @returns {Promise<Object|null>} Decoded payload, or null if invalid/expired
 */
export async function verifyJwt(token, secret) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) return null

    const encoder = new TextEncoder()
    const data = `${headerB64}.${payloadB64}`
    const key = await getSigningKey(secret)
    const signature = base64UrlToBuffer(signatureB64)

    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data))
    if (!valid) return null

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBuffer(payloadB64)),
    )

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Hashes a password with PBKDF2-SHA256.
 * @param {string} password
 * @param {string} [salt] - Hex string; generated if not provided
 * @returns {Promise<string>} Format: `salt:hash` (both hex)
 */
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder()

  let saltBuffer
  if (salt) {
    saltBuffer = new Uint8Array(salt.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)))
  } else {
    saltBuffer = crypto.getRandomValues(new Uint8Array(16))
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )

  const hashHex = [...new Uint8Array(derivedBits)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const saltHex = [...saltBuffer]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `${saltHex}:${hashHex}`
}

/**
 * Verifies a password against a stored hash.
 * @param {string} password
 * @param {string} storedHash - Format: `salt:hash`
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  const [salt] = storedHash.split(':')
  const rehashed = await hashPassword(password, salt)
  return rehashed === storedHash
}

/**
 * Extracts and verifies the JWT from the request's auth cookie.
 * @param {Request} request
 * @param {string} secret - JWT_SECRET from env
 * @returns {Promise<Object|null>} User payload or null
 */
export async function getAuthUser(request, secret) {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/(?:^|;\s*)vallle_token=([^;]+)/)
  if (!match) return null
  return verifyJwt(match[1], secret)
}

/**
 * Creates a Set-Cookie header for the auth token.
 * @param {string} token
 * @returns {string}
 */
export function authCookie(token) {
  return `vallle_token=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${JWT_EXPIRY}`
}

/**
 * Creates a Set-Cookie header that clears the auth token.
 * @returns {string}
 */
export function clearAuthCookie() {
  return 'vallle_token=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0'
}
