import Link from 'next/link'
import Image from 'next/image'
import { Stepper } from '@/components/ui'
import { Leaf, ShieldIcon, UserIcon, LockIcon } from '@/components/icons'
import { getSession } from '@/lib/session'
import { onboardingProgress, type Rail } from '@/lib/onboarding'

/**
 * The onboarding frame.
 *
 * The step rail is real navigation: it is built from what is in the database,
 * so a finished step is a link back and an unreached one is inert. The panel on
 * the right carries the reassurance a patient wants at exactly this moment —
 * who reads this, what it costs, what happens next.
 */
export default async function OnboardShell({
  step,
  title,
  subtitle,
  children,
  showAside = true,
  rail = 'signup',
}: {
  step: number
  title: string
  subtitle?: string
  children: React.ReactNode
  showAside?: boolean
  /** The comp uses a different rail during the medical intake. */
  rail?: Rail
}) {
  const session = await getSession()
  const steps = await onboardingProgress(session?.userId ?? null, rail)

  return (
    <div className="ml-shell min-h-screen p-5 max-[560px]:p-0">
      <header className="mx-auto flex h-[62px] w-full max-w-[1120px] items-center px-2 max-[560px]:px-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[23px] font-extrabold no-underline text-ink"
        >
          <Leaf className="ml-green" size={26} /> MediLean
        </Link>
        <Link href="/login" className="ml-sub ml-auto no-underline hover:text-white">
          Already have an account? <span className="ml-green">Log in</span>
        </Link>
      </header>

      <section className="ml-card mx-auto w-full max-w-[1120px] max-[560px]:rounded-none">
        <div className="p-7 max-[560px]:p-4">
          <Stepper steps={steps} current={step} />

          <div
            className={`mt-7 grid gap-8 ${
              showAside ? 'grid-cols-[minmax(0,1fr)_330px] max-[880px]:grid-cols-1' : 'grid-cols-1'
            }`}
          >
            <div className="min-w-0 max-w-[520px]">
              <h2 className="mb-1.5 text-[24px] font-bold">{title}</h2>
              {subtitle ? <div className="ml-sub">{subtitle}</div> : null}
              {children}
            </div>

            {showAside ? <Aside /> : null}
          </div>
        </div>
      </section>

      <p className="ml-sub mx-auto mt-4 max-w-[1120px] px-2 pb-6 text-[11px]">
        MediLean supports clinician review. It does not diagnose, decide treatment, or prescribe.
      </p>
    </div>
  )
}

function Aside() {
  return (
    <aside className="relative min-h-[440px] overflow-hidden rounded-xl border border-[#173039] max-[880px]:min-h-[300px]">
      <Image
        src="/img/onboarding-bg.png"
        alt=""
        fill
        sizes="(max-width: 880px) 100vw, 330px"
        className="object-cover"
      />
      {/* Weighted dark enough that the type below is readable at any crop. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,18,24,.62)_0%,rgba(6,18,24,.80)_45%,rgba(6,18,24,.94)_100%)]" />

      <div className="relative flex h-full flex-col p-7 max-[560px]:p-5">
        <h3 className="m-0 text-[25px] font-semibold italic leading-[1.22] text-white">
          Better Health,
          <br />
          Brighter Tomorrows
        </h3>
        <div className="mt-4 h-[3px] w-11 rounded-sm bg-[#58edb5]" />

        <ul className="mt-7 flex list-none flex-col gap-5 p-0">
          {[
            { Icon: UserIcon, t: 'A physician reads every intake', d: 'Not an algorithm. A licensed clinician decides.' },
            { Icon: ShieldIcon, t: 'Your answers are encrypted', d: 'And you can see who opened your record.' },
            { Icon: LockIcon, t: 'Nothing is charged yet', d: 'Billing starts only once a plan is approved.' },
          ].map(({ Icon, t, d }) => (
            <li key={t} className="flex gap-3.5">
              <Icon className="ml-green mt-0.5 flex-none" size={19} />
              <div>
                <div className="text-[13.5px] font-medium leading-snug text-[#e7eff1]">{t}</div>
                <div className="mt-1 text-[12px] leading-snug text-[#9db0b7]">{d}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-7 text-[12.5px] leading-[1.6] text-[#b6c6cc]">
          Physician-guided.
          <br />
          Built for real life.
        </div>
      </div>
    </aside>
  )
}
