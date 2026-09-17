import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { Role } from '@/generated/prisma/enums'

/**
 * Session handling.
 *
 * A signed, httpOnly cookie holding only an id and a role — never a name, an
 * email or anything clinical, because a cookie travels through places we do not
 * control. Everything else is looked up per request.
 *
 * In production this is the layer to swap for Cognito or Auth0; the rest of the
 * application only depends on `getSession()` and `requireRole()`.
 */

const COOKIE = 'medilean_session'
const MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours, then re-authenticate

/**
 * Should the cookie be marked Secure?
 *
 * This has to follow how the app is actually reached, not whether it was built
 * in production mode. A browser silently refuses to store a Secure cookie over
 * plain http, which looks exactly like a broken login: the server signs you in,
 * the redirect happens, and the next request arrives with no session.
 *
 * So it is explicit. Set COOKIE_SECURE=false only for an http demo; anything
 * serving real patients is behind TLS and leaves it alone.
 */
function secureCookie(): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false
  if (process.env.COOKIE_SECURE === 'true') return true
  return process.env.NODE_ENV === 'production'
}

export type Session = {
  userId: string
  role: Role
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set.')
  return new TextEncoder().encode(s)
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret())

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(),
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secret())
    if (!payload.sub || !payload.role) return null
    return { userId: payload.sub, role: payload.role as Role }
  } catch {
    // Expired or tampered. Treat exactly like signed out.
    return null
  }
}
