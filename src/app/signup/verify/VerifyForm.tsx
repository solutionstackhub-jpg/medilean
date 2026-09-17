'use client'

import { useActionState, useState, useTransition } from 'react'
import { verifyCode, resendVerification, type FormState } from '@/actions/auth'
import { FormError, SubmitButton, Banner } from '@/components/ui'

export default function VerifyForm({
  simulated,
  code,
}: {
  simulated: boolean
  code: string | null
}) {
  const [state, action] = useActionState<FormState, FormData>(verifyCode, {})
  const [resent, setResent] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div>
      {simulated ? (
        <div className="mt-5">
          <Banner tone="warn">
            No email transport is configured, so nothing was actually sent. Your code is{' '}
            <strong className="font-mono tracking-widest text-ink">{code ?? '—'}</strong>.
            {resent ? <> A new code was issued: <strong className="font-mono tracking-widest text-ink">{resent}</strong>.</> : null}
            <br />
            Setting <code>MAIL_FROM</code> turns this off, and it never appears in production.
          </Banner>
        </div>
      ) : null}

      <form action={action}>
        <div className="ml-field">
          <label htmlFor="code">Verification Code</label>
          <input
            id="code"
            name="code"
            className="ml-input text-center text-lg tracking-[8px]"
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            defaultValue={simulated ? (resent ?? code ?? '') : ''}
            required
          />
        </div>

        <div className="ml-notes">
          The email itself contains no health information — only a code and a link back here.
        </div>

        <FormError message={state.error} />

        <div className="mt-5">
          <SubmitButton pendingLabel="Checking…">Verify Email</SubmitButton>
        </div>
      </form>

      <button
        type="button"
        className="ml-sub mt-4 text-[13px] underline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await resendVerification()
            if (r.ok) {
              // The page re-reads the new code on the next render; show it now too.
              const fresh = await fetch('/api/verification-code').then((x) => x.json()).catch(() => null)
              setResent(fresh?.code ?? null)
            }
          })
        }
      >
        {pending ? 'Sending…' : 'Send me a new code'}
      </button>
    </div>
  )
}
