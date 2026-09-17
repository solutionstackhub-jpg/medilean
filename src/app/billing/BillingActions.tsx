'use client'

import { useActionState } from 'react'
import { startSubscription, type BillingState } from '@/actions/billing'
import { FormError, SubmitButton } from '@/components/ui'

export default function BillingActions({ active }: { active: boolean }) {
  const [state, action] = useActionState<BillingState, FormData>(startSubscription, {})
  if (active) return null

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
