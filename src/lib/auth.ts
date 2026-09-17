import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession, type Session } from '@/lib/session'
import type { Role } from '@/generated/prisma/enums'

/**
 * Authorization.
 *
 * Every read of a patient record goes through one of these functions, so there
 * is a single place to audit and a single place to fix. Hiding a link in the UI
 * is not access control.
 */

export class Forbidden extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'Forbidden'
  }
}

/**
 * A signed cookie proves someone held a session; it does not prove the account
 * still exists or is still allowed in. The cookie outlives the row, so an
 * account that has been deleted, suspended, or had its role changed would
 * otherwise keep working until the token expired.
 *
 * This is the session-revocation gap listed in docs/SECURITY.md, closed by
 * checking the account on every request that matters.
 */
async function loadValidSession(): Promise<Session | null> {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true },
  })

  // The cookie is left alone: a page render is not allowed to write cookies,
  // and it does not need to. The account is re-checked on every request, so a
  // stale token can never do anything. Signing in again replaces it.
  if (!user || user.status === 'SUSPENDED') return null

  // Follow the database if a role was changed after the cookie was issued.
  return { userId: user.id, role: user.role }
}

export async function requireSession(): Promise<Session> {
  const hadCookie = Boolean(await getSession())
  const session = await loadValidSession()

  // Only say a session went stale when there actually was one. Someone opening
  // a bookmarked page while signed out is not "signed out", they are signed
  // out already, and telling them otherwise is alarming for no reason.
  if (!session) redirect(hadCookie ? '/login?expired=1' : '/login')

  return session
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireSession()
  if (!roles.includes(session.role)) redirect('/login?denied=1')
  return session
}

/**
 * A patient who has finished verifying their email.
 *
 * The comp makes Verify step two of five, and everything after it depends on
 * reaching a real person: a check-in reminder, a note that their plan changed,
 * a message from their clinician. Letting an unverified account wander an empty
 * application is worse than telling them what is left to do, so this sends them
 * back to the step they stopped on.
 */
export async function requireVerifiedPatient(): Promise<Session> {
  const session = await requireRole('PATIENT')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { emailVerifiedAt: true },
  })
  if (!user?.emailVerifiedAt) redirect('/signup/verify')

  return session
}

export async function currentUser() {
  const session = await loadValidSession()
  if (!session) return null
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { patientProfile: true },
  })
}

/**
 * Can `session` see this patient's records?
 *
 * Deny by default. A patient sees only themselves. Clinicians see patients, and
 * in a larger practice this is where an assignment check would go. An admin has
 * no clinical read access by default — administration and care are different jobs.
 */
export function canAccessPatient(session: Session, patientId: string): boolean {
  if (session.role === 'PATIENT') return session.userId === patientId
  if (session.role === 'PHYSICIAN') return true
  return false
}

export async function assertPatientAccess(session: Session, patientId: string): Promise<void> {
  if (!canAccessPatient(session, patientId)) {
    throw new Forbidden(`${session.role} may not access patient ${patientId}`)
  }
}

/** For API route handlers, which return a status rather than redirecting. */
export async function apiSession(): Promise<Session | null> {
  return loadValidSession()
}
