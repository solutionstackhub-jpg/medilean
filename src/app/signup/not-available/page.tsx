import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import OnboardShell from '@/components/OnboardShell'
import { Banner } from '@/components/ui'

/**
 * Reached when a patient's state is not one the physician is licensed in.
 * The flow stops here on purpose: finishing an intake that can never be
 * reviewed wastes the patient's time and creates a record nobody can act on.
 */
export default async function NotAvailablePage() {
  const session = await requireVerifiedPatient()

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: session.userId },
    select: { stateCode: true },
  })
  const state = profile?.stateCode
    ? await prisma.eligibleState.findUnique({ where: { code: profile.stateCode } })
    : null
  const open = await prisma.eligibleState.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { name: true },
  })

  return (
    <OnboardShell
      step={3}
      title="Not Available in Your State Yet"
      subtitle="We would rather tell you now than after you have filled in a full medical history."
      showAside={false}
    >
      <div className="mt-4 max-w-[640px]">
        <Banner tone="warn">
          Our physicians are not currently licensed in{' '}
          <strong>{state?.name ?? 'your state'}</strong>, so we are not able to review an intake or
          offer a treatment plan there.
        </Banner>

        <p className="ml-sub mt-5">
          Your account stays as it is and nothing has been charged. We will email you if that
          changes — the message will say only that your state has opened, with no health
          information in it.
        </p>

        <div className="ml-panel mt-5 p-4">
          <div className="mb-2 text-[13px] font-bold">Currently available in</div>
          <div className="ml-sub">{open.map((s) => s.name).join(' · ')}</div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/signup/profile" className="ml-btn no-underline">
            ← Change my state
          </Link>
          <Link href="/" className="ml-btn ml-btn-primary no-underline">
            Back to home
          </Link>
        </div>
      </div>
    </OnboardShell>
  )
}
