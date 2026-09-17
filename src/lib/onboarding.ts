import { prisma } from '@/lib/db'

/**
 * Onboarding progress.
 *
 * The comp uses two different step rails and they are not the same list:
 *
 *   signing up   Account · Verify · Profile · Medical Intake · Complete
 *   medical intake  Account · Profile · Medical Intake · Review · Complete
 *
 * The second one has a Review step, where the patient reads back what they
 * answered before it goes to a clinician. That is worth having for its own sake:
 * a correction made here is a correction the physician never has to chase.
 *
 * Which steps are reachable is decided from what is in the database, never from
 * the URL, so a hand-typed address cannot skip verification or the eligibility
 * check.
 */

export type OnboardStep = {
  n: number
  label: string
  href: string
  done: boolean
  reachable: boolean
}

export type Rail = 'signup' | 'intake'

const SIGNUP_RAIL = [
  { label: 'Account', href: '/signup' },
  { label: 'Verify', href: '/signup/verify' },
  { label: 'Profile', href: '/signup/profile' },
  { label: 'Medical Intake', href: '/intake' },
  { label: 'Complete', href: '/intake/complete' },
]

const INTAKE_RAIL = [
  { label: 'Account', href: '/signup' },
  { label: 'Profile', href: '/signup/profile' },
  { label: 'Medical Intake', href: '/intake' },
  { label: 'Review', href: '/intake/review' },
  { label: 'Complete', href: '/intake/complete' },
]

export async function onboardingProgress(
  userId: string | null,
  rail: Rail = 'signup',
): Promise<OnboardStep[]> {
  const spec = rail === 'intake' ? INTAKE_RAIL : SIGNUP_RAIL

  const build = (done: boolean[], reachable: boolean[]): OnboardStep[] =>
    spec.map((s, i) => ({ n: i + 1, label: s.label, href: s.href, done: done[i], reachable: reachable[i] }))

  const none = [false, false, false, false, false]
  if (!userId) return build(none, [rail === 'signup', false, false, false, false])

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerifiedAt: true,
      patientProfile: { select: { stateCode: true } },
      submissions: {
        where: { questionnaire: { type: 'INTAKE' } },
        select: { status: true, _count: { select: { answers: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!user) return build(none, [rail === 'signup', false, false, false, false])

  const verified = Boolean(user.emailVerifiedAt)
  const profiled = Boolean(user.patientProfile?.stateCode)
  const latest = user.submissions[0]
  const started = (latest?._count.answers ?? 0) > 0
  const submitted = Boolean(latest && latest.status !== 'DRAFT')

  if (rail === 'intake') {
    // Account · Profile · Medical Intake · Review · Complete
    const done = [true, profiled, started, submitted, submitted]
    // Review opens once there is something to review; step 1 closes for good.
    const reachable = [false, verified, profiled, started, submitted]
    return build(done, reachable)
  }

  // Account · Verify · Profile · Medical Intake · Complete
  const done = [true, verified, profiled, submitted, submitted]
  const reachable = [false, true, verified, profiled, submitted]
  return build(done, reachable)
}
