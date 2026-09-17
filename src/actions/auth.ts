'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { createSession, destroySession, getSession } from '@/lib/session'
import { requireVerifiedPatient } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'

export type FormState = { error?: string; ok?: boolean }

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

function homeFor(role: string) {
  if (role === 'PHYSICIAN') return '/physician'
  if (role === 'ADMIN') return '/admin/flags'
  return '/dashboard'
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })

  // Same message and roughly the same work either way: a login form should not
  // tell an attacker which addresses exist.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'
  const valid = await bcrypt.compare(parsed.data.password, hash)

  if (!user || !valid) {
    await audit({
      action: 'auth.login_failed',
      entity: 'User',
      entityId: user?.id ?? null,
      meta: { email: parsed.data.email },
    })
    return { error: 'Those details did not match an account.' }
  }

  if (user.status === 'SUSPENDED') {
    await audit({ actorId: user.id, actorRole: user.role, action: 'auth.login_suspended', entity: 'User', entityId: user.id })
    return { error: 'This account is suspended. Please contact support.' }
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await createSession({ userId: user.id, role: user.role })
  await audit({ actorId: user.id, actorRole: user.role, action: 'auth.login', entity: 'User', entityId: user.id })

  redirect(homeFor(user.role))
}

export async function logout(): Promise<void> {
  const session = await getSession()
  if (session) {
    await audit({
      actorId: session.userId,
      actorRole: session.role,
      action: 'auth.logout',
      entity: 'User',
      entityId: session.userId,
    })
  }
  await destroySession()
  redirect('/login')
}

/**
 * One-click sign-in for the three seeded demo accounts.
 *
 * Only ever signs in an address from the fixed list below, and only while the
 * demo flag is on, so it cannot be used to impersonate a real patient. It
 * exists because typing an email and a password three times to compare three
 * roles is friction with nothing to teach.
 */
const DEMO_LOGINS = [
  'jane@example.com',
  'dr.smith@medilean.test',
  'admin@medilean.test',
] as const

export async function demoLogin(formData: FormData): Promise<void> {
  if (process.env.SHOW_VERIFICATION_CODE !== 'true') redirect('/login')

  const email = String(formData.get('email') ?? '')
  if (!DEMO_LOGINS.includes(email as (typeof DEMO_LOGINS)[number])) redirect('/login')

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.status === 'SUSPENDED') redirect('/login')

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await createSession({ userId: user.id, role: user.role })
  await audit({
    actorId: user.id, actorRole: user.role,
    action: 'auth.login_demo', entity: 'User', entityId: user.id,
  })

  redirect(homeFor(user.role))
}

/** Is the one-click demo sign-in available? */
export async function demoLoginEnabled(): Promise<boolean> {
  return process.env.SHOW_VERIFICATION_CODE === 'true'
}

const signupSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name.'),
  email: z.string().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .regex(/[A-Z]/, 'Include one uppercase letter.')
    .regex(/[0-9]/, 'Include one number.'),
})

/**
 * Is email running as a simulation?
 *
 * Without a mail transport the six digit code has nowhere to go, which leaves
 * anyone trying the product stuck on step two. Showing the code is a deliberate
 * demonstration affordance, so it is behind an explicit opt-in rather than an
 * inferred one: NODE_ENV is the wrong switch here because a demo is a
 * production build too.
 *
 * Both conditions must hold — the flag is set AND no transport is configured —
 * so wiring up real email disables it even if the flag is left behind.
 */
export async function emailIsSimulated(): Promise<boolean> {
  return process.env.SHOW_VERIFICATION_CODE === 'true' && !process.env.MAIL_FROM
}

/**
 * The code to show on the verify screen while email is simulated.
 *
 * If the outstanding token predates this feature, or has expired, there is
 * nothing readable to show and the patient would be stuck looking at a blank.
 * In that case a fresh code is issued here, which is safe: the old one is
 * consumed at the same time, and this only ever runs in simulation.
 */
export async function peekVerificationCode(): Promise<string | null> {
  if (!(await emailIsSimulated())) return null

  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, emailVerifiedAt: true },
  })
  if (!user || user.emailVerifiedAt) return null

  const token = await prisma.verificationToken.findFirst({
    where: {
      userId: session.userId, kind: 'EMAIL', consumedAt: null,
      expiresAt: { gt: new Date() }, plainForDev: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { plainForDev: true },
  })
  if (token?.plainForDev) return token.plainForDev

  return issueVerificationCode(session.userId, user.email)
}

/** Issue a fresh code, for when the first one expired or never arrived. */
export async function resendVerification(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, emailVerifiedAt: true },
  })
  if (!user) redirect('/login')
  if (user.emailVerifiedAt) return { ok: true }

  const code = await issueVerificationCode(session.userId, user.email)
  await audit({
    actorId: session.userId, actorRole: session.role,
    action: 'auth.verification_resent', entity: 'User', entityId: session.userId,
    patientId: session.userId,
  })
  return { ok: Boolean(code) }
}

/**
 * Create a verification code.
 *
 * The hash is what authenticates; the plaintext copy exists only while there is
 * no mail transport, so a developer or a demo can read it back. A real
 * deployment sets MAIL_FROM and this column stays null.
 */
async function issueVerificationCode(userId: string, email: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const simulated = process.env.SHOW_VERIFICATION_CODE === 'true' && !process.env.MAIL_FROM

  await prisma.verificationToken.updateMany({
    where: { userId, kind: 'EMAIL', consumedAt: null },
    data: { consumedAt: new Date() },
  })
  await prisma.verificationToken.create({
    data: {
      userId,
      kind: 'EMAIL',
      codeHash: await bcrypt.hash(code, 10),
      plainForDev: simulated ? code : null,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  })
  await prisma.notification.create({
    data: { userId, channel: 'EMAIL', templateKey: 'verify_email', deliveredAt: new Date() },
  })
  console.log(`[dev] verification code for ${email}: ${code}`)
  return code
}

/** Step 1 of onboarding: create the account. The patient is not active yet. */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    fullName: String(formData.get('fullName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return { error: 'An account already exists for that email. Try signing in.' }
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: 'PATIENT',
      status: 'PENDING_VERIFICATION',
      patientProfile: { create: {} },
    },
  })

  // Hashed, with no clinical content in the message — see docs/SECURITY.md.
  await issueVerificationCode(user.id, user.email)

  await createSession({ userId: user.id, role: user.role })
  await audit({ actorId: user.id, actorRole: 'PATIENT', action: 'auth.signup', entity: 'User', entityId: user.id, patientId: user.id })

  redirect('/signup/verify')
}

export async function verifyCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession()
  if (!session) redirect('/login')

  const code = String(formData.get('code') ?? '').trim()
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the six digit code.' }

  const token = await prisma.verificationToken.findFirst({
    where: { userId: session.userId, kind: 'EMAIL', consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!token) return { error: 'That code has expired. Request a new one.' }

  if (!(await bcrypt.compare(code, token.codeHash))) {
    await audit({ actorId: session.userId, actorRole: session.role, action: 'auth.verify_failed', entity: 'User', entityId: session.userId, patientId: session.userId })
    return { error: 'That code did not match.' }
  }

  await prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } })
  await prisma.user.update({
    where: { id: session.userId },
    data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
  })
  await audit({ actorId: session.userId, actorRole: session.role, action: 'auth.email_verified', entity: 'User', entityId: session.userId, patientId: session.userId })

  redirect('/signup/profile')
}

const profileSchema = z.object({
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth.'),
  sex: z.enum(['FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED']),
  stateCode: z.string().length(2, 'Select the state you live in.'),
  phone: z.string().min(7, 'Enter a phone number we can reach you on.'),
})

/** Step 3: demographics and the location eligibility check. */
export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  // Step three sits after Verify in the rail, so it needs a verified account.
  const session = await requireVerifiedPatient()

  const parsed = profileSchema.safeParse({
    dob: String(formData.get('dob') ?? ''),
    sex: String(formData.get('sex') ?? 'UNDISCLOSED'),
    stateCode: String(formData.get('stateCode') ?? ''),
    phone: String(formData.get('phone') ?? '').trim(),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const state = await prisma.eligibleState.findUnique({ where: { code: parsed.data.stateCode } })
  if (!state) return { error: 'Select the state you live in.' }

  await prisma.user.update({
    where: { id: session.userId },
    data: { phoneEnc: encrypt(parsed.data.phone) },
  })
  await prisma.patientProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      dobEnc: encrypt(parsed.data.dob),
      sex: parsed.data.sex,
      stateCode: parsed.data.stateCode,
    },
    update: {
      dobEnc: encrypt(parsed.data.dob),
      sex: parsed.data.sex,
      stateCode: parsed.data.stateCode,
    },
  })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'patient.profile_saved',
    entity: 'PatientProfile',
    entityId: session.userId,
    patientId: session.userId,
    meta: { stateCode: parsed.data.stateCode, eligible: state.active },
  })

  // The practice cannot treat someone in a state the physician is not licensed
  // in. This is a legal boundary, so it stops the flow rather than warning.
  if (!state.active) redirect('/signup/not-available')

  redirect('/intake')
}
