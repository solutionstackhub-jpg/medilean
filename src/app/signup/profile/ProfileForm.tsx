'use client'

import { useActionState, useState } from 'react'
import { saveProfile, type FormState } from '@/actions/auth'
import { FormError, SubmitButton, Banner } from '@/components/ui'

type StateRow = { code: string; name: string; active: boolean }

export default function ProfileForm({ states }: { states: StateRow[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, {})
  const [selected, setSelected] = useState('')

  const chosen = states.find((s) => s.code === selected)
  // Warn as soon as the state is picked, rather than after the form is submitted.
  const ineligible = chosen && !chosen.active

  return (
    <form action={action}>
      <div className="ml-field">
        <label htmlFor="dob">Date of Birth</label>
        <input id="dob" name="dob" type="date" className="ml-input" required />
      </div>

      <div className="ml-field">
        <label htmlFor="sex">Sex assigned at birth</label>
        <select id="sex" name="sex" className="ml-input" defaultValue="UNDISCLOSED" required>
          <option value="FEMALE">Female</option>
          <option value="MALE">Male</option>
          <option value="OTHER">Other</option>
          <option value="UNDISCLOSED">Prefer not to say</option>
        </select>
      </div>

      <div className="ml-field">
        <label htmlFor="stateCode">State you live in</label>
        <select
          id="stateCode"
          name="stateCode"
          className="ml-input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          required
        >
          <option value="" disabled>
            Select your state…
          </option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
              {s.active ? '' : ' — not yet available'}
            </option>
          ))}
        </select>
      </div>

      {ineligible ? (
        <div className="mt-3">
          <Banner tone="warn">
            Our physicians are not licensed in {chosen?.name} yet, so we cannot treat you there.
            You can still continue and we will let you know when that changes.
          </Banner>
        </div>
      ) : null}

      <div className="ml-field">
        <label htmlFor="phone">Mobile Number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="ml-input"
          placeholder="+1 555 0100"
          autoComplete="tel"
          required
        />
      </div>

      <div className="ml-notes">
        We use your number for account alerts only. Nothing about your care is ever sent by text.
      </div>

      <FormError message={state.error} />

      <div className="mt-4">
        <SubmitButton pendingLabel="Saving…">Continue to Medical Intake</SubmitButton>
      </div>
    </form>
  )
}
