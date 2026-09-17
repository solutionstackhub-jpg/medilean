import Link from 'next/link'
import { requireVerifiedPatient } from '@/lib/auth'
import { getOrCreateSubmission } from '@/actions/intake'
import { loadAnswers, withDerived, bmi } from '@/lib/clinical'
import { visibleQuestions, type Condition } from '@/lib/rules'
import OnboardShell from '@/components/OnboardShell'
import { Banner } from '@/components/ui'
import SubmitIntake from './SubmitIntake'

function render(value: unknown, options: Array<{ value: string; label: string }> | null): string {
  const label = (v: unknown) => options?.find((o) => o.value === String(v))?.label ?? String(v)
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.map(label).join(', ') : '—'
  return label(value)
}

/**
 * Step 4 in the comp's intake rail: read it back before a clinician sees it.
 *
 * Worth having for its own sake — a correction made here is one the physician
 * never has to chase in a message thread.
 */
export default async function IntakeReviewPage() {
  const session = await requireVerifiedPatient()
  const { questionnaire, submission } = await getOrCreateSubmission(session.userId, 'intake')
  const answers = await loadAnswers(submission.id)

  const asked = visibleQuestions(
    questionnaire.questions.map((q) => ({ ...q, showIf: q.showIf as Condition | null })),
    answers,
  )
  const missing = asked.filter((q) => {
    if (!q.required) return false
    const v = answers[q.key]
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
  })

  const derived = withDerived(answers)
  const currentBmi = bmi(Number(answers['height_in']), Number(answers['weight_lb']))

  return (
    <OnboardShell
      step={4}
      rail="intake"
      showAside={false}
      title="Check Your Answers"
      subtitle="Nothing has been sent yet. Change anything that is not right."
    >
      <div className="mt-6 max-w-[760px]">
        {missing.length ? (
          <div className="mb-4">
            <Banner tone="warn">
              {missing.length} required question{missing.length === 1 ? '' : 's'} still need an answer:{' '}
              {missing.map((m) => m.label).join(', ')}.{' '}
              <Link href="/intake" className="ml-green">
                Go back and finish →
              </Link>
            </Banner>
          </div>
        ) : null}

        <section className="ml-card">
          <div className="ml-card-title flex items-center justify-between">
            <span>Your answers</span>
            <Link href="/intake" className="ml-btn-review no-underline">
              Edit
            </Link>
          </div>
          <div className="p-5">
            {asked.map((q) => (
              <div key={q.key} className="border-b border-line py-3 last:border-0">
                <div className="ml-sub text-[12px]">{q.label}</div>
                <div className="mt-1 text-[14px]">
                  {render(answers[q.key], q.options as Array<{ value: string; label: string }> | null)}
                </div>
              </div>
            ))}
            {asked.length === 0 ? (
              <div className="ml-sub">
                Nothing answered yet.{' '}
                <Link href="/intake" className="ml-green">
                  Start the intake →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {currentBmi ? (
          <section className="ml-card mt-3">
            <div className="ml-card-title">Worked out from your answers</div>
            <div className="p-5">
              <div className="ml-file">
                <span className="ml-sub">BMI</span>
                <span>{String(derived.bmi ?? currentBmi)}</span>
              </div>
              <div className="ml-sub mt-3 text-[11px]">
                Calculated from your height and weight. It is one input among several and is not a
                diagnosis.
              </div>
            </div>
          </section>
        ) : null}

        <div className="ml-panel mt-4 p-5">
          <div className="mb-2 text-[14px] font-bold">What happens when you submit</div>
          <p className="ml-sub m-0">
            Your answers go to a licensed physician, encrypted. They decide on a plan — nothing is
            diagnosed or prescribed automatically, and you are not charged until a plan is approved.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Link href="/intake" className="ml-btn no-underline">
            ← Back to questions
          </Link>
          <SubmitIntake disabled={missing.length > 0} />
        </div>
      </div>
    </OnboardShell>
  )
}
