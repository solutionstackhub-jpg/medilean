import Link from 'next/link'
import Image from 'next/image'
import { getSession } from '@/lib/session'
import SiteNav from '@/components/SiteNav'
import {
  Leaf, UserIcon, ShieldIcon, ChartIcon, ClipboardIcon, TrendIcon, MailIcon,
  ArrowRight, BarCluster, LockIcon, StethoscopeIcon,
} from '@/components/icons'

export default async function MarketingPage() {
  const session = await getSession()
  const appHref =
    session?.role === 'PHYSICIAN' ? '/physician' : session?.role === 'ADMIN' ? '/admin/flags' : '/dashboard'

  return (
    <div className="ml-shell min-h-screen p-5 max-[560px]:p-0">
      {/* ------------------------------------------------------------ header */}
      <header className="flex h-[62px] items-center gap-8 px-[18px] max-[560px]:px-[13px]">
        <Link href="/" className="flex items-center gap-2.5 text-[23px] font-extrabold no-underline text-ink">
          <Leaf className="ml-green" size={27} />
          MediLean
        </Link>

        <SiteNav />

        <div className="ml-auto flex gap-3">
          {session ? (
            <Link href={appHref} className="ml-btn ml-btn-primary no-underline">
              Open MediLean
            </Link>
          ) : (
            <>
              <Link href="/login" className="ml-btn no-underline max-[560px]:hidden">
                Log In
              </Link>
              <Link href="/signup" className="ml-btn ml-btn-primary no-underline">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-xl border border-[#122b34] bg-[#07151c] max-[560px]:rounded-none">
        <Image
          src="/img/hero-photo.png"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 60vw"
          className="!left-auto !right-0 !top-0 !h-full !w-[60%] object-cover object-[50%_14%] max-[900px]:!w-full max-[900px]:opacity-40"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#07151c_0%,#07151c_36%,rgba(7,21,28,.86)_50%,rgba(7,21,28,.25)_70%,rgba(7,21,28,.35)_100%)] max-[900px]:bg-[linear-gradient(90deg,rgba(7,21,28,.96),rgba(7,21,28,.6))]" />

        <div className="relative grid min-h-[460px] grid-cols-[1.25fr_300px] gap-8 px-12 py-14 max-[1100px]:grid-cols-1 max-[900px]:px-7 max-[900px]:py-11 max-[560px]:px-5">
          {/* copy */}
          <div className="max-w-[620px]">
            <div className="text-[11px] tracking-[2.4px] text-[#c3ced2]">
              PHYSICIAN-GUIDED WEIGHT MANAGEMENT
            </div>
            <h1 className="mb-3 mt-4 text-[46px] font-bold leading-[1.06] max-[560px]:text-[34px]">
              Real Support.
              <br />A <span className="ml-green">Healthier</span> Tomorrow.
            </h1>
            <p className="m-0 max-w-[430px] text-[15px] leading-[1.5] text-[#c5d0d4]">
              Personalized care, evidence-based treatment, and ongoing support — all from the
              comfort of home.
            </p>

            <div className="my-7 flex gap-7 max-[560px]:grid max-[560px]:grid-cols-1 max-[560px]:gap-3.5">
              {[
                { Icon: UserIcon, a: 'U.S. Licensed', b: 'Physicians' },
                { Icon: ShieldIcon, a: 'Secure &', b: 'HIPAA-Compliant' },
                { Icon: ChartIcon, a: 'Personalized', b: 'Treatment Plans' },
              ].map(({ Icon, a, b }) => (
                <div key={a} className="flex items-center gap-3 text-[12px] leading-[1.35]">
                  <span className="ml-circle">
                    <Icon />
                  </span>
                  <span>
                    {a}
                    <br />
                    {b}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup" className="ml-btn ml-btn-primary inline-flex items-center gap-2.5 no-underline">
                Get Started <ArrowRight />
              </Link>
              <a href="#how-it-works" className="ml-btn ml-btn-ghost inline-flex items-center gap-1.5 no-underline">
                How It Works <span className="text-[#8fa2aa]">›</span>
              </a>
            </div>
          </div>

          {/* the two cards from the comp: a quote, and the progress note below it */}
          <aside className="flex flex-col gap-3.5 self-start max-[1100px]:hidden">
            <div className="rounded-2xl border border-[#3c525b] bg-[rgba(17,34,42,.82)] p-6 backdrop-blur-[10px]">
              <p className="m-0 text-[17px] leading-[1.42]">
                “I feel healthier, more energetic, and more like myself again.”
              </p>
              <div className="ml-green mt-4 text-[11px]">— Actual Patient</div>
            </div>

            <div className="rounded-2xl border border-[#3c525b] bg-[rgba(17,34,42,.82)] p-6 backdrop-blur-[10px]">
              <div className="flex items-center gap-3.5">
                <BarCluster className="ml-green" />
                <div className="text-[17px] font-medium leading-[1.25]">
                  Small Steps
                  <br />
                  Big Change
                </div>
              </div>
              <hr className="my-5 border-0 border-t border-[#3c525b]" />
              <div className="text-[12px] leading-[1.6] text-[#a9bcc3]">
                Supported by real people.
                <br />
                Backed by real science.
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ---------------------------------------------------------- flow strip */}
      <div className="mt-[3px] grid grid-cols-[repeat(4,1fr)_240px] rounded-lg border border-[#122b34] bg-panel max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
        {[
          { Icon: UserIcon, a: 'Medical Intake', b: 'from Home' },
          { Icon: ClipboardIcon, a: 'Physician Review', b: '& Treatment Plan' },
          { Icon: TrendIcon, a: 'Ongoing Support', b: '& Progress Tracking' },
          { Icon: MailIcon, a: 'Secure Messaging', b: 'with Your Care Team' },
        ].map(({ Icon, a, b }) => (
          <div
            key={a}
            className="flex items-center gap-3.5 border-r border-line px-6 py-5 text-[12px] leading-[1.4] max-[1100px]:border-b"
          >
            <span className="ml-circle">
              <Icon />
            </span>
            <span>
              {a}
              <br />
              {b}
            </span>
          </div>
        ))}

        <div className="flex flex-col justify-center px-6 py-5 max-[1100px]:col-span-2 max-[560px]:col-span-1">
          <div className="text-[13px] leading-[1.4]">
            A healthier you
            <br />
            is within reach.
          </div>
          <div className="mt-2.5 h-[3px] w-11 rounded-sm bg-[#58edb5]" />
        </div>
      </div>

      {/* -------------------------------------------------------- how it works */}
      <section id="how-it-works" className="mt-3 scroll-mt-6">
        <SectionHead
          eyebrow="How it works"
          title="Four steps, and none of them involve a waiting room"
        />
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {[
            { n: '01', t: 'Medical intake from home', d: 'A guided questionnaire that adapts to your answers. About ten minutes, and you can stop and come back.' },
            { n: '02', t: 'A physician reviews it', d: 'A licensed physician reads your intake and decides on a plan. No automated diagnosis, no prescription without a clinician.' },
            { n: '03', t: 'Your plan begins', d: 'If you are a good fit, your plan starts and billing begins. If you are not, we tell you plainly and you are not charged.' },
            { n: '04', t: 'Support that continues', d: 'Monthly check-ins, progress tracking, and a secure message thread with your care team between visits.' },
          ].map((s) => (
            <div key={s.n} className="ml-card p-6">
              <div className="ml-green text-[12px] font-bold tracking-wider">{s.n}</div>
              <h3 className="mb-2 mt-2.5 text-[15px] font-bold leading-snug">{s.t}</h3>
              <p className="ml-sub m-0">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- treatments */}
      <section id="treatments" className="mt-3 scroll-mt-6">
        <SectionHead
          eyebrow="Treatments"
          title="What a plan can include"
          note="Every plan is decided by a physician. Nothing here is prescribed automatically."
        />
        <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
          {[
            { Icon: StethoscopeIcon, t: 'Physician-guided medication', d: 'Where clinically appropriate, a prescription plan managed and adjusted by your physician, with check-ins that catch side effects early.' },
            { Icon: TrendIcon, t: 'Progress tracking', d: 'Weight and BMI over time, with optional private progress photographs that stay yours unless you share them.' },
            { Icon: MailIcon, t: 'Care between visits', d: 'A secure thread with your care team. No clinical detail ever leaves the platform by email or text.' },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="ml-card p-6">
              <span className="ml-circle mb-4">
                <Icon />
              </span>
              <h3 className="mb-2 text-[15px] font-bold">{t}</h3>
              <p className="ml-sub m-0">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ physicians */}
      <section id="physicians" className="mt-3 scroll-mt-6">
        <SectionHead eyebrow="Our physicians" title="Licensed, and licensed where you live" />
        <div className="ml-card p-8 max-[560px]:p-5">
          <div className="grid grid-cols-3 gap-8 max-[900px]:grid-cols-1">
            <div>
              <h3 className="mb-2 text-[15px] font-bold">State licensure is checked first</h3>
              <p className="ml-sub m-0">
                We ask where you live before you fill in a medical history. If our physicians are
                not licensed there, we say so on the spot rather than letting you complete an
                intake nobody could review.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-[15px] font-bold">A clinician reads every case</h3>
              <p className="ml-sub m-0">
                Our software flags things worth a second look and routes the case to a physician.
                It does not diagnose, decide treatment, or prescribe. A human does that.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-[15px] font-bold">You can see who opened your chart</h3>
              <p className="ml-sub m-0">
                Every access to your record is logged, and you can read that log yourself from your
                profile. That is not a feature we added late; it is how the system is built.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- pricing */}
      <section id="pricing" className="mt-3 scroll-mt-6">
        <SectionHead eyebrow="Pricing" title="One plan, no surprises" />
        <div className="ml-card p-8 max-[560px]:p-5">
          <div className="flex flex-wrap items-center justify-between gap-7">
            <div className="max-w-[420px]">
              <h3 className="mb-2 text-[24px] font-bold">Weight Management Program</h3>
              <p className="ml-sub m-0">
                Physician review, your treatment plan, monthly check-ins and unlimited secure
                messaging with your care team.
              </p>
              <ul className="ml-sub mt-4 list-none space-y-1.5 p-0">
                {[
                  'Cancel any time, from your billing page',
                  'No charge until a physician approves a plan',
                  'Card details handled by Stripe, never stored by us',
                ].map((l) => (
                  <li key={l} className="flex gap-2.5">
                    <span className="ml-green">●</span> {l}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-right">
              <div className="text-[40px] font-extrabold leading-none">$299</div>
              <div className="ml-sub mt-1.5">per month</div>
            </div>

            <Link href="/signup" className="ml-btn ml-btn-primary inline-flex items-center gap-2.5 no-underline">
              Get Started <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- resources */}
      <section id="resources" className="mt-3 scroll-mt-6">
        <SectionHead eyebrow="Resources" title="Questions people ask before signing up" />
        <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
          {[
            { q: 'Is my health information private?', a: 'Your record is encrypted, access is logged, and any email or text we send says only that something is waiting for you — never anything clinical.' },
            { q: 'Will I definitely get a prescription?', a: 'No. A physician decides, and for some people the answer is that this programme is not appropriate. You are not charged if that is the outcome.' },
            { q: 'What if I live somewhere you do not serve?', a: 'We tell you during sign-up, before you fill in a medical history, and we will email you if that changes.' },
            { q: 'Can I stop?', a: 'Yes, from your billing page, at any time. Your record stays available to you.' },
          ].map((f) => (
            <div key={f.q} className="ml-card p-6">
              <div className="flex gap-3">
                <LockIcon className="ml-green mt-0.5 flex-none" />
                <div>
                  <h3 className="mb-1.5 text-[14px] font-bold">{f.q}</h3>
                  <p className="ml-sub m-0">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- foot */}
      <footer className="mt-3 rounded-lg border border-[#122b34] bg-panel px-8 py-9 max-[560px]:px-5">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-[440px]">
            <div className="flex items-center gap-2.5 text-[19px] font-extrabold">
              <Leaf className="ml-green" size={22} />
              MediLean
            </div>
            <p className="ml-sub mt-3">
              MediLean supports clinician review. It does not diagnose, decide treatment, or
              prescribe. Clinical protocols and prescribing policy are set and approved by the
              supervising physician.
            </p>
          </div>

          <nav className="flex gap-12 text-[13px] max-[560px]:gap-8">
            <div>
              <div className="ml-sub mb-3 text-[11px] uppercase tracking-wider">Product</div>
              <div className="flex flex-col gap-2">
                <a href="#how-it-works" className="no-underline text-ink hover:text-[#58edb5]">How It Works</a>
                <a href="#treatments" className="no-underline text-ink hover:text-[#58edb5]">Treatments</a>
                <a href="#pricing" className="no-underline text-ink hover:text-[#58edb5]">Pricing</a>
              </div>
            </div>
            <div>
              <div className="ml-sub mb-3 text-[11px] uppercase tracking-wider">Company</div>
              <div className="flex flex-col gap-2">
                <a href="#physicians" className="no-underline text-ink hover:text-[#58edb5]">Our Physicians</a>
                <a href="#resources" className="no-underline text-ink hover:text-[#58edb5]">Resources</a>
                <Link href="/login" className="no-underline text-ink hover:text-[#58edb5]">Log In</Link>
              </div>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <div className="mb-3.5 px-1 pt-5">
      <div className="ml-green text-[12px] font-bold tracking-wider">{eyebrow}</div>
      <h2 className="mt-1.5 text-[26px] font-bold max-[560px]:text-[21px]">{title}</h2>
      {note ? <p className="ml-sub mt-1.5 max-w-[620px]">{note}</p> : null}
    </div>
  )
}
