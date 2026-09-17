import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import OnboardShell from '@/components/OnboardShell'
import { emailIsSimulated, peekVerificationCode } from '@/actions/auth'
import VerifyForm from './VerifyForm'

/**
 * Step 2 of onboarding.
 *
 * This step belongs to one account, so it needs a session: without one there is
 * no code to check and nothing to verify. Rendering it signed out produced a
 * screen that looked usable and could not work.
 */
export default async function VerifyPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, status: true, emailVerifiedAt: true },
  })

  // The cookie outlives the row, so the account is checked, not assumed.
  if (!user || user.status === 'SUSPENDED') redirect('/login?expired=1')
  if (user.role !== 'PATIENT') redirect('/login?denied=1')

  // Nothing left to do here.
  if (user.emailVerifiedAt) redirect('/signup/profile')

  const simulated = await emailIsSimulated()
  const code = simulated ? await peekVerificationCode() : null

  return (
    <OnboardShell
      step={2}
      title="Verify Your Email"
      subtitle="We sent a six digit code to your email address. It expires in 15 minutes."
    >
      <VerifyForm simulated={simulated} code={code} />
    </OnboardShell>
  )
}
