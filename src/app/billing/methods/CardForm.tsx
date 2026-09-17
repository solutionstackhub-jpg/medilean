'use client'

import { useActionState } from 'react'
import { updatePaymentMethod, type BillingState } from '@/actions/billing'
import { FormError, SubmitButton } from '@/components/ui'

export default function CardForm({ simulated }: { simulated: boolean }) {
  const [state, action] = useActionState<BillingState, FormData>(updatePaymentMethod, {})

  if (!simulated) {
    return (
      <form action={action}>
        <SubmitButton className="ml-btn ml-btn-primary" pendingLabel="Opening Stripe…">
          Manage card in Stripe
        </SubmitButton>
        <FormError message={state.error} />
      </form>
    )
  }

  return (
    <form action={action} className="max-w-[520px]">
      <div className="grid grid-cols-2 gap-3">
        <div className="ml-field">
          <label htmlFor="brand">Card type</label>
          <select id="brand" name="brand" className="ml-input" defaultValue="visa">
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">American Express</option>
          </select>
        </div>
        <div className="ml-field">
          <label htmlFor="last4">Last four digits</label>
          <input id="last4" name="last4" className="ml-input" inputMode="numeric" maxLength={4} placeholder="4242" required />
        </div>
        <div className="ml-field">
          <label htmlFor="expMonth">Expiry month</label>
          <input id="expMonth" name="expMonth" className="ml-input" inputMode="numeric" placeholder="12" required />
        </div>
        <div className="ml-field">
          <label htmlFor="expYear">Expiry year</label>
          <input id="expYear" name="expYear" className="ml-input" inputMode="numeric" placeholder="2028" required />
        </div>
      </div>

      <FormError message={state.error} />
      {state.ok ? <div className="ml-green mt-3 text-[13px]">{state.ok}</div> : null}

      <div className="mt-5">
        <SubmitButton className="ml-btn ml-btn-primary" pendingLabel="Saving…">Save card</SubmitButton>
      </div>
    </form>
  )
}
