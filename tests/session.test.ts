import { describe, expect, it } from 'vitest'

/**
 * Session validity rules.
 *
 * A signed cookie proves someone held a session once. It does not prove the
 * account still exists, is still active, or still has the role the token
 * claims. These are the decisions `loadValidSession` makes, pulled out so they
 * can be tested without a database.
 */

type Account = { id: string; role: 'PATIENT' | 'PHYSICIAN' | 'ADMIN'; status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' } | null

function resolveSession(tokenSub: string, tokenRole: string, account: Account) {
  if (!account) return null
  if (account.status === 'SUSPENDED') return null
  // The database wins over whatever the token claims.
  return { userId: account.id, role: account.role, tokenSaid: tokenRole, tokenSub }
}

describe('session validity', () => {
  it('rejects a token for an account that no longer exists', () => {
    // This is the crash that took every signed-in page down after a re-seed:
    // the cookie survived, the row did not.
    expect(resolveSession('deleted-id', 'PATIENT', null)).toBeNull()
  })

  it('rejects a suspended account even with a valid token', () => {
    const suspended = { id: 'u1', role: 'PATIENT' as const, status: 'SUSPENDED' as const }
    expect(resolveSession('u1', 'PATIENT', suspended)).toBeNull()
  })

  it('accepts an active account', () => {
    const active = { id: 'u1', role: 'PATIENT' as const, status: 'ACTIVE' as const }
    expect(resolveSession('u1', 'PATIENT', active)).toMatchObject({ userId: 'u1', role: 'PATIENT' })
  })

  it('follows the database when a role changed after the token was issued', () => {
    // Someone demoted from physician to patient must not keep clinician access
    // until their cookie happens to expire.
    const demoted = { id: 'u1', role: 'PATIENT' as const, status: 'ACTIVE' as const }
    expect(resolveSession('u1', 'PHYSICIAN', demoted)?.role).toBe('PATIENT')
  })

  it('still allows an account that has not verified its email', () => {
    // Verification is a step inside onboarding, not a reason to be signed out of it.
    const pending = { id: 'u1', role: 'PATIENT' as const, status: 'PENDING_VERIFICATION' as const }
    expect(resolveSession('u1', 'PATIENT', pending)).not.toBeNull()
  })
})
