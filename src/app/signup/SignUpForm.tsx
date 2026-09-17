'use client'

import { useActionState } from 'react'
import { signUp, type FormState } from '@/actions/auth'
import { FormError, SubmitButton } from '@/components/ui'

export default function SignUpForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, {})

  return (
    <form action={action}>
      <div className="ml-field">
        <label htmlFor="fullName">Full Name</label>
        <input id="fullName" name="fullName" className="ml-input" placeholder="John Doe" autoComplete="name" required />
      </div>
      <div className="ml-field">
        <label htmlFor="email">Email Address</label>
        <input id="email" name="email" type="email" className="ml-input" placeholder="you@example.com" autoComplete="email" required />
      </div>
      <div className="ml-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="ml-input" placeholder="••••••••" autoComplete="new-password" required />
      </div>

      <div className="ml-notes">
        <span className="ml-green">●</span> At least 8 characters<br />
        <span className="ml-green">●</span> One uppercase letter<br />
        <span className="ml-green">●</span> One number
      </div>

      <FormError message={state.error} />

      <div className="mt-5">
        <SubmitButton pendingLabel="Creating…">Create Account</SubmitButton>
      </div>

      <p className="ml-sub mt-4 text-[12px]">
        By continuing you agree to the terms of service and privacy notice.
      </p>
    </form>
  )
}
