import Link from 'next/link'
import OnboardShell from '@/components/OnboardShell'
import { requireVerifiedPatient } from '@/lib/auth'
import { Banner } from '@/components/ui'

export default async function IntakeCompletePage() {
  await requireVerifiedPatient()

  return (
    <OnboardShell
      step={5}
      rail="intake"
      title="Intake Submitted"
      subtitle="Thank you. Your answers are with the care team."
      showAside={false}
    >
      <div className="mt-4 max-w-[640px]">
        <Banner>
          A licensed physician will read your intake and decide on a plan. Nothing has been
          prescribed and nothing has been decided automatically.
        </Banner>

        <div className="ml-panel mt-5 p-5">
          <div className="mb-3 text-[14px] font-bold">What happens next</div>
          <ol className="ml-sub m-0 list-decimal space-y-2 pl-5">
            <li>A physician reviews your intake, usually within one business day.</li>
            <li>If anything needs clarifying, you will get a secure message here.</li>
            <li>Once a plan is agreed, billing starts and your first check-in is scheduled.</li>
          </ol>
        </div>

        <p className="ml-sub mt-5">
          If we email or text you, it will say only that something is waiting. Nothing about your
          health leaves the platform.
        </p>

        <div className="mt-6">
          <Link href="/dashboard" className="ml-btn ml-btn-primary no-underline">
            Go to my dashboard →
          </Link>
        </div>
      </div>
    </OnboardShell>
  )
}
