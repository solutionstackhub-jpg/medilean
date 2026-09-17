'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, demoLogin, type FormState } from '@/actions/auth'
import { FormError, SubmitButton, Banner } from '@/components/ui'
import { Leaf, UserIcon, StethoscopeIcon, SettingsIcon } from '@/components/icons'

const DEMO = [
  { email: 'jane@example.com', label: 'Patient', who: 'Jane Powell', Icon: UserIcon,
    note: 'On a plan, with progress, messages and invoices' },
  { email: 'dr.smith@medilean.test', label: 'Physician', who: 'Dr. Alan Smith', Icon: StethoscopeIcon,
    note: 'Review queue, flagged cases, clinical notes' },
  { email: 'admin@medilean.test', label: 'Practice admin', who: 'Practice Admin', Icon: SettingsIcon,
    note: 'Clinical flag rules and licensed states' },
]

export default function LoginForm({ demo }: { demo: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(login, {})
  const params = useSearchParams()
  const denied = params.get('denied')
  const expired = params.get('expired')

  return (
    <div className="ml-shell flex min-h-screen flex-col p-5 max-[560px]:p-0">
      <header className="flex h-[62px] items-center px-[18px] max-[560px]:px-[13px]">
        <Link href="/" className="flex items-center gap-2.5 text-[23px] font-extrabold no-underline text-ink">
          <Leaf className="ml-green" size={26} /> MediLean
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[880px] flex-1 items-start gap-4 pt-8 max-[880px]:flex-col max-[560px]:pt-2">
        {/* ------------------------------------------------------- sign in */}
        <section className="ml-card w-full max-w-[420px] p-8 max-[880px]:max-w-none max-[560px]:rounded-none max-[560px]:p-5">
          <h2 className="mb-1.5 text-[22px] font-bold">Welcome back</h2>
          <div className="ml-sub">Sign in to your MediLean account.</div>

          {denied ? (
            <div className="mt-4">
              <Banner tone="warn">That area is not available for your account.</Banner>
            </div>
          ) : null}

          {expired ? (
            <div className="mt-4">
              <Banner tone="warn">
                Your session is no longer valid, so you have been signed out. Please sign in again.
              </Banner>
            </div>
          ) : null}

          <form action={action}>
            <div className="ml-field">
              <label htmlFor="email">Email Address</label>
              <input id="email" name="email" type="email" autoComplete="email" className="ml-input" placeholder="you@example.com" required />
            </div>
            <div className="ml-field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" className="ml-input" placeholder="••••••••" required />
            </div>

            <FormError message={state.error} />

            <div className="mt-6">
              <SubmitButton pendingLabel="Signing in…">Log In</SubmitButton>
            </div>
          </form>

          <p className="ml-sub mt-5 text-center">
            New here?{' '}
            <Link href="/signup" className="ml-green no-underline">Create an account</Link>
          </p>
        </section>

        {/* -------------------------------------------------- demo shortcuts */}
        {demo ? (
          <section className="ml-card w-full flex-1 p-7 max-[560px]:rounded-none max-[560px]:p-5">
            <h3 className="text-[15px] font-bold">Try it without signing up</h3>
            <p className="ml-sub mt-1.5">
              Three seeded accounts, one click each. The password for all of them is{' '}
              <span className="font-mono text-ink">Password123</span> if you would rather type it.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              {DEMO.map(({ email, label, who, note, Icon }) => (
                <form key={email} action={demoLogin}>
                  <input type="hidden" name="email" value={email} />
                  <button
                    type="submit"
                    className="ml-panel flex w-full cursor-pointer items-center gap-4 p-4 text-left hover:border-[#2a5348]"
                  >
                    <span className="ml-circle">
                      <Icon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{label} — {who}</span>
                      <span className="ml-sub block text-[12px]">{note}</span>
                      <span className="ml-sub block font-mono text-[11px]">{email}</span>
                    </span>
                    <span className="ml-green flex-none text-[13px]">Sign in →</span>
                  </button>
                </form>
              ))}
            </div>

            <p className="ml-sub mt-5 text-[11px]">
              These shortcuts exist only while the demo flag is set. They sign in a fixed list of
              seeded accounts and cannot reach a real patient record.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  )
}
