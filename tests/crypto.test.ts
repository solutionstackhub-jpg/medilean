import { beforeAll, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

/**
 * PHI encryption. The key is set here rather than read from .env so the test
 * proves the behaviour and not the developer's local configuration.
 */
beforeAll(() => {
  process.env.PHI_ENC_KEY = crypto.randomBytes(32).toString('base64')
})

describe('field encryption', () => {
  it('round-trips a value', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const plain = 'Emily Carter, DOB 1992-05-12'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('produces different ciphertext each time, so equal values are not linkable', async () => {
    const { encrypt } = await import('@/lib/crypto')
    expect(encrypt('yes')).not.toBe(encrypt('yes'))
  })

  it('never leaks the plaintext into the stored string', async () => {
    const { encrypt } = await import('@/lib/crypto')
    expect(encrypt('pancreatitis')).not.toContain('pancreatitis')
  })

  it('refuses tampered ciphertext instead of returning garbage', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const payload = encrypt('no')
    const parts = payload.split('.')
    parts[3] = Buffer.from('tampered').toString('base64url')
    expect(() => decrypt(parts.join('.'))).toThrow()
  })

  it('carries a version prefix so keys can be rotated later', async () => {
    const { encrypt } = await import('@/lib/crypto')
    expect(encrypt('x').startsWith('v1.')).toBe(true)
  })

  it('round-trips structured answers', async () => {
    const { encryptJson, decryptJson } = await import('@/lib/crypto')
    const value = ['high_bp', 'thyroid']
    expect(decryptJson(encryptJson(value))).toEqual(value)
  })

  it('degrades to a fallback rather than throwing in list views', async () => {
    const { tryDecrypt } = await import('@/lib/crypto')
    expect(tryDecrypt('not-a-ciphertext', 'file')).toBe('file')
    expect(tryDecrypt(null, '')).toBe('')
  })
})

describe('key handling', () => {
  it('refuses to start with a wrong-length key', async () => {
    vi.resetModules()
    process.env.PHI_ENC_KEY = Buffer.from('too short').toString('base64')
    const mod = await import('@/lib/crypto')
    expect(() => mod.encrypt('x')).toThrow(/32 bytes/)
  })

  it('refuses to start with no key at all, rather than storing plaintext', async () => {
    vi.resetModules()
    delete process.env.PHI_ENC_KEY
    const mod = await import('@/lib/crypto')
    expect(() => mod.encrypt('x')).toThrow(/PHI_ENC_KEY is not set/)
    process.env.PHI_ENC_KEY = crypto.randomBytes(32).toString('base64')
  })
})
