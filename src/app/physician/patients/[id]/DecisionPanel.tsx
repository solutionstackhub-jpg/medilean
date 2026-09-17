'use client'

import { useActionState, useState } from 'react'
import { recordDecision, type ReviewState } from '@/actions/review'
import { FormError, SubmitButton } from '@/components/ui'
import type { SubmissionStatus } from '@/generated/prisma/enums'

const CHOICES: Array<{ value: SubmissionStatus; label: string; hint: string }> = [
  { value: 'IN_REVIEW', label: 'Mark in review', hint: 'You have picked this up but are not finished.' },
  { value: 'NEEDS_INFO', label: 'Request more information', hint: 'The patient is asked for more detail.' },
  { value: 'APPROVED', label: 'Approve plan', hint: 'You are satisfied and the programme can start.' },
  { value: 'DECLINED', label: 'Decline', hint: 'Not suitable for this programme.' },
]

export default function DecisionPanel({
  submissionId,
  currentStatus,
}: {
  submissionId: string
  currentStatus: SubmissionStatus
}) {
  const [state, action] = useActionState<ReviewState, FormData>(recordDecision, {})
  const [choice, setChoice] = useState<SubmissionStatus>(
    currentStatus === 'SUBMITTED' ? 'IN_REVIEW' : currentStatus,
  )

  const hint = CHOICES.find((c) => c.value === choice)?.hint

  return (
    <section className="ml-card">
      <div className="ml-card-title">Your Decision</div>
      <form action={action} className="p-5">
        <input type="hidden" name="submissionId" value={submissionId} />
        <input type="hidden" name="status" value={choice} />

        <div className="ml-sub mb-3 text-[12px]">
          Current status: <span className="text-ink">{currentStatus.replace('_', ' ').toLowerCase()}</span>
        </div>

        {CHOICES.map((c) => (
          <label key={c.value} className={`ml-check ${choice === c.value ? 'is-on' : ''}`}>
            <input
              type="radio"
              name="statusChoice"
              className="sr-only"
              checked={choice === c.value}
              onChange={() => setChoice(c.value)}
            />
            <span className="ml-box ml-radio" />
            {c.label}
          </label>
        ))}

        {hint ? <div className="ml-sub mt-2 text-[12px]">{hint}</div> : null}

        {choice === 'APPROVED' ? (
          <div className="ml-panel mt-4 p-4">
            <div className="mb-1 text-[13px] font-bold">The plan you are approving</div>
            <div className="ml-sub mb-2 text-[11px]">
              This is what the patient sees on their dashboard. Encrypted, like the rest of the chart.
            </div>
            <div className="ml-field">
              <label htmlFor="medication">Treatment</label>
              <input id="medication" name="medication" className="ml-input" placeholder="Semaglutide" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="ml-field">
                <label htmlFor="dose">Starting dose</label>
                <input id="dose" name="dose" className="ml-input" placeholder="0.25 mg" />
              </div>
              <div className="ml-field">
                <label htmlFor="schedule">Schedule</label>
                <input id="schedule" name="schedule" className="ml-input" placeholder="Weekly injections" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="ml-field">
          <label htmlFor="note">Clinical note</label>
          <textarea
            id="note"
            name="note"
            rows={5}
            className="ml-input"
            placeholder="What you saw, what you decided, and why."
            required
          />
        </div>

        <div className="ml-sub mt-2 text-[11px]">
          A note is required. It is encrypted, attributed to you, and kept with the case.
        </div>

        <FormError message={state.error} />
        {state.ok ? (
          <div className="ml-green mt-3 text-[13px]">Saved. The patient has been notified.</div>
        ) : null}

        <div className="mt-4">
          <SubmitButton pendingLabel="Saving…">Record decision</SubmitButton>
        </div>
      </form>
    </section>
  )
}
