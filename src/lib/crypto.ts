import crypto from 'node:crypto'

/**
 * Application-layer encryption for PHI columns.
 *
 * Postgres already encrypts at rest, but that only protects the disk. This
 * protects the *values*: a leaked backup, a mistaken `SELECT *` in a support
 * tool, or a read-replica shared with an analytics vendor all show ciphertext.
 *
 * Format: v1.<iv>.<authTag>.<ciphertext>, all base64url.
 * The version prefix exists so keys can be rotated without a migration.
 */

const VERSION = 'v1'
const ALGO = 'aes-256-gcm'
const IV_BYTES = 12

function loadKey(): Buffer {
  const raw = process.env.PHI_ENC_KEY
  if (!raw) {
    throw new Error(
      'PHI_ENC_KEY is not set. Refusing to start: PHI would be written in plaintext.',
    )
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`PHI_ENC_KEY must decode to 32 bytes, got ${key.length}.`)
  }
  return key
}

let cachedKey: Buffer | null = null
function key(): Buffer {
  if (!cachedKey) cachedKey = loadKey()
  return cachedKey
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGO, key(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.')
}

export function decrypt(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split('.')
  if (version !== VERSION) {
    throw new Error(`Unsupported ciphertext version: ${version}`)
  }
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

/** Convenience for JSON-shaped answers. */
export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value))
}

export function decryptJson<T = unknown>(payload: string): T {
  return JSON.parse(decrypt(payload)) as T
}

/** Decrypt without throwing — used in list views where one bad row must not 500 the page. */
export function tryDecrypt(payload: string | null | undefined, fallback = ''): string {
  if (!payload) return fallback
  try {
    return decrypt(payload)
  } catch {
    return fallback
  }
}
