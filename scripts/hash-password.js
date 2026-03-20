/**
 * Generates a PBKDF2-SHA256 password hash for use in seed data.
 * Run with: node scripts/hash-password.js <password>
 *
 * Copy the output into the seed SQL file.
 * Uses the same algorithm as functions/api/auth/_helpers.js
 */

import { webcrypto } from 'node:crypto'

const PBKDF2_ITERATIONS = 100_000
const password = process.argv[2] || 'vallle123'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const saltBuffer = webcrypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await webcrypto.subtle.deriveBits(
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

const hash = await hashPassword(password)
console.log(`Password: ${password}`)
console.log(`Hash:     ${hash}`)
console.log('')
console.log('Replace placeholder hashes in migrations/0002_seed.sql with this value.')
