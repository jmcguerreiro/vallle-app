/**
 * Simple ULID generator using Web Crypto API.
 * No external dependencies — works in Cloudflare Workers.
 */

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Encodes a timestamp (ms) into 10 Crockford Base32 characters.
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string}
 */
function encodeTime(timestamp) {
  let str = "";
  let remaining = timestamp;
  for (let i = 9; i >= 0; i--) {
    str = CROCKFORD_BASE32[remaining % 32] + str;
    remaining = Math.floor(remaining / 32);
  }
  return str;
}

/**
 * Encodes 16 random characters using Crockford Base32.
 * @returns {string}
 */
function encodeRandom() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let str = "";
  for (let i = 0; i < 16; i++) {
    // Use 5 bits per character from the random bytes
    const byteIndex = Math.floor((i * 5) / 8);
    const bitOffset = (i * 5) % 8;
    let value = (bytes[byteIndex] >> (3 - bitOffset)) & 0x1f;
    if (bitOffset > 3) {
      value =
        ((bytes[byteIndex] << (bitOffset - 3)) |
          (bytes[byteIndex + 1] >> (11 - bitOffset))) &
        0x1f;
    }
    str += CROCKFORD_BASE32[value];
  }
  return str;
}

/**
 * Generates a ULID (Universally Unique Lexicographically Sortable Identifier).
 * Uses crypto.getRandomValues for randomness (available in CF Workers).
 * @returns {string} 26-character ULID
 */
export function generateUlid() {
  const timestamp = Date.now();
  return encodeTime(timestamp) + encodeRandom();
}
