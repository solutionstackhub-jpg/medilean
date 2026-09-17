'use client'

import { useState, useTransition } from 'react'
import { submitIntake } from '@/actions/intake'
import { FormError } from '@/components/ui'

export default function SubmitIntake({ disabled }: { disabled: boolean }) {
  const [error, setError] = useState<string | undefined>()
  const [pending, start] = useTransition()

  return (
    <div className="text-right">
      <button
        type="button"
        className="ml-btn ml-btn-primary"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const result = await submitIntake()
            if (result && !result.ok) setError(result.error)
          })
        }
      >
        {pending ? 'Sending…' : 'Submit for review'}
      </button>
      <FormError message={error} />
    </div>
  )
}
