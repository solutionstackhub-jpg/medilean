import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/db'

/**
 * File storage.
 *
 * One narrow interface with swappable drivers behind it. Everything else in the
 * application deals in opaque storage keys and never in paths or buckets, so
 * moving to S3 means implementing `put`, `get` and `remove` here and changing
 * nothing else.
 *
 * Files are encrypted with the same key as the PHI columns before they are
 * written, whichever driver is in use. A lab report or a progress photograph is
 * as identifying as anything in the database, and an uploads directory — or a
 * database backup — is easy to copy by accident.
 *
 * Drivers:
 *   local  writes to disk. The default, and right for development.
 *   db     writes ciphertext to Postgres. Needed on serverless platforms such
 *          as Vercel, where the filesystem is read-only.
 */

const ALGO = 'aes-256-gcm'

type Driver = 'local' | 'db'

function driver(): Driver {
  const explicit = process.env.STORAGE_DRIVER
  if (explicit === 'local' || explicit === 'db') return explicit
  // Vercel sets this, and its filesystem cannot be written to.
  if (process.env.VERCEL) return 'db'
  return 'local'
}

function root(): string {
  return process.env.UPLOAD_DIR || './.uploads'
}

function key(): Buffer {
  const raw = process.env.PHI_ENC_KEY
  if (!raw) throw new Error('PHI_ENC_KEY is not set.')
  return Buffer.from(raw, 'base64')
}

export function newStorageKey(): string {
  return crypto.randomBytes(24).toString('hex')
}

/** iv | tag | ciphertext */
function seal(data: Buffer): Buffer {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key(), iv)
  const body = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

function unseal(raw: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGO, key(), raw.subarray(0, 12))
  decipher.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])
}

export async function putObject(storageKey: string, data: Buffer): Promise<void> {
  const sealed = seal(data)

  if (driver() === 'db') {
    // Prisma's Bytes maps to Uint8Array; Buffer is one but TypeScript wants it said.
    const bytes = new Uint8Array(sealed)
    await prisma.documentBlob.upsert({
      where: { storageKey },
      create: { storageKey, data: bytes },
      update: { data: bytes },
    })
    return
  }

  const dir = root()
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, storageKey), sealed, { mode: 0o600 })
}

export async function getObject(storageKey: string): Promise<Buffer | null> {
  try {
    if (driver() === 'db') {
      const row = await prisma.documentBlob.findUnique({ where: { storageKey } })
      return row ? unseal(Buffer.from(row.data)) : null
    }
    return unseal(await fs.readFile(path.join(root(), storageKey)))
  } catch {
    // A missing or unreadable object is not an exception the caller can act on;
    // the route turns this into a 410.
    return null
  }
}

export async function deleteObject(storageKey: string): Promise<void> {
  try {
    if (driver() === 'db') {
      await prisma.documentBlob.delete({ where: { storageKey } })
      return
    }
    await fs.unlink(path.join(root(), storageKey))
  } catch {
    // Already gone is the outcome we wanted.
  }
}

export const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
export const MAX_BYTES = 10 * 1024 * 1024
