'use client'

import { useActionState } from 'react'
import { startSubscription, cancelSubscription, resumeSubscription, type BillingState } from '@/actions/billing'
import { FormError, SubmitButton } from '@/components/ui'

export default function PlanControls({ status }: { status: string }) {
  const [state, action] = useActionState<BillingState, FormData>(startSubscription, {})

  if (status === 'ACTIVE' || status === 'TRIALING') {
    return (
      <form action={cancelSubscription}>
        <button type="submit" className="ml-btn">Cancel plan</button>
        <p className="ml-sub mt-2 text-[11px]">
          You keep access until the end of the period you have paid for.
        </p>
      </form>
    )
  }

  if (status === 'CANCELED') {
    return (
      <form action={resumeSubscription}>
        <button type="submit" className="ml-btn ml-btn-primary">Resume plan</button>
      </form>
    )
  }

  return (
    <div>
      <form action={action}>
        <SubmitButton className="ml-btn ml-btn-primary" pendingLabel="Opening checkout…">
          Start plan
        </SubmitButton>
      </form>
      <FormError message={state.error} />
      {state.ok ? <div className="ml-green mt-2 text-[12px]">{state.ok}</div> : null}
    </div>
  )
}
