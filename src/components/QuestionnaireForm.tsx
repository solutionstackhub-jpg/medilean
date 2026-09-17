'use client'

import { useMemo, useState, useTransition } from 'react'
import { visibleQuestions, type Answers, type Condition } from '@/lib/rules'
import { FormError } from '@/components/ui'

export type QuestionDto = {
  key: string
  label: string
  helpText: string | null
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'NUMBER' | 'TEXT' | 'BOOLEAN'
  required: boolean
  options: Array<{ value: string; label: string }> | null
  showIf: Condition | null
  order: number
}

/**
 * Renders a questionnaire one page at a time, re-evaluating the branching rules
 * on every answer. The same `visibleQuestions` helper runs again on the server
 * before anything is stored, so the browser decides what to *show* and never
 * what to accept.
 */
export default function QuestionnaireForm({
  title,
  subtitle,
  questions,
  initialAnswers,
  onSave,
  onFinish,
  submitLabel = 'Review my answers',
  perPage = 4,
}: {
  title: string
  subtitle?: string | null
  questions: QuestionDto[]
  initialAnswers: Answers
  /** Saves a draft. Called between pages and by "save and finish later". */
  onSave: (answers: Answers) => Promise<{ ok: boolean; error?: string }>
  /** Called on the last page. May navigate, so it is not expected to return. */
  onFinish: (answers: Answers) => Promise<{ ok: boolean; error?: string } | void>
  submitLabel?: string
  perPage?: number
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  // Recomputed on every keystroke: answering "Type 2 Diabetes" makes the
  // medication question appear immediately, and unticking it hides it again.
  const visible = useMemo(() => visibleQuestions(questions, answers), [questions, answers])

  const pages = Math.max(1, Math.ceil(visible.length / perPage))
  const safePage = Math.min(page, pages - 1)
  const slice = visible.slice(safePage * perPage, safePage * perPage + perPage)
  const isLast = safePage === pages - 1
  const progress = Math.round(((safePage + 1) / pages) * 100)

  function setAnswer(key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    setError(undefined)
  }

  function toggleMulti(key: string, value: string, options: Array<{ value: string }>) {
    const current = Array.isArray(answers[key]) ? (answers[key] as string[]) : []
    let next: string[]

    // "None of the above" is exclusive — ticking it clears the rest, and ticking
    // anything else clears it. Without this a chart can say both at once.
    const exclusive = options.find((o) => o.value === 'none')?.value
    if (exclusive && value === exclusive) {
      next = current.includes(exclusive) ? [] : [exclusive]
    } else {
      next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      if (exclusive) next = next.filter((v) => v !== exclusive)
    }
    setAnswer(key, next)
  }

  function missingOnPage() {
    return slice.filter((q) => {
      if (!q.required) return false
      const v = answers[q.key]
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
    })
  }

  function next() {
    const missing = missingOnPage()
    if (missing.length) {
      setError(`Please answer: ${missing.map((m) => m.label).join(', ')}`)
      return
    }
    setError(undefined)
    startTransition(async () => {
      await onSave(answers)
      setPage((p) => Math.min(p + 1, pages - 1))
    })
  }

  function finish() {
    const missing = missingOnPage()
    if (missing.length) {
      setError(`Please answer: ${missing.map((m) => m.label).join(', ')}`)
      return
    }
    startTransition(async () => {
      const result = await onFinish(answers)
      if (result && !result.ok) setError(result.error)
    })
  }

  function saveDraft() {
    startTransition(async () => {
      await onSave(answers)
      setSaved(true)
    })
  }

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-bold">{title}</h2>
      {subtitle ? <div className="ml-sub">{subtitle}</div> : null}

      <div className="ml-progressline">
        <b style={{ width: `${progress}%` }} />
      </div>
      <div className="ml-sub mb-5 flex justify-between text-[12px]">
        <span>
          Step {safePage + 1} of {pages}
        </span>
        <span>{saved ? 'Draft saved' : 'Your answers are saved as you go'}</span>
      </div>

      <div className="flex flex-col gap-7">
        {slice.map((q) => (
          <fieldset key={q.key} className="m-0 border-0 p-0">
            <legend className="mb-1 p-0 text-[15px] font-bold">
              {q.label}
              {q.required ? <span className="ml-danger"> *</span> : null}
            </legend>
            {q.helpText ? <div className="ml-sub mb-2">{q.helpText}</div> : null}

            {q.type === 'MULTI_CHOICE' && q.options ? (
              <div className="mt-2">
                {q.options.map((opt) => {
                  const on = Array.isArray(answers[q.key]) && (answers[q.key] as string[]).includes(opt.value)
                  return (
                    <label key={opt.value} className={`ml-check ${on ? 'is-on' : ''}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => toggleMulti(q.key, opt.value, q.options!)}
                      />
                      <span className="ml-box" />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            ) : null}

            {q.type === 'SINGLE_CHOICE' && q.options ? (
              <div className="mt-2">
                {q.options.map((opt) => {
                  const on = answers[q.key] === opt.value
                  return (
                    <label key={opt.value} className={`ml-check ${on ? 'is-on' : ''}`}>
                      <input
                        type="radio"
                        name={q.key}
                        className="sr-only"
                        checked={on}
                        onChange={() => setAnswer(q.key, opt.value)}
                      />
                      <span className="ml-box ml-radio" />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            ) : null}

            {q.type === 'NUMBER' ? (
              <input
                type="number"
                inputMode="decimal"
                className="ml-input mt-2 max-w-[220px]"
                value={(answers[q.key] as string | number) ?? ''}
                onChange={(e) => setAnswer(q.key, e.target.value === '' ? '' : Number(e.target.value))}
              />
            ) : null}

            {q.type === 'TEXT' ? (
              <textarea
                rows={3}
                className="ml-input mt-2"
                value={(answers[q.key] as string) ?? ''}
                onChange={(e) => setAnswer(q.key, e.target.value)}
              />
            ) : null}
          </fieldset>
        ))}
      </div>

      <FormError message={error} />

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          className="ml-btn"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0 || pending}
        >
          ← Back
        </button>

        <div className="flex gap-3">
          <button type="button" className="ml-btn" onClick={saveDraft} disabled={pending}>
            Save &amp; finish later
          </button>
          {isLast ? (
            <button type="button" className="ml-btn ml-btn-primary" onClick={finish} disabled={pending}>
              {pending ? 'Saving…' : submitLabel}
            </button>
          ) : (
            <button type="button" className="ml-btn ml-btn-primary" onClick={next} disabled={pending}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
