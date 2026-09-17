'use client'

import { useActionState, useState } from 'react'
import { saveFlagRule, type FlagState } from '@/actions/flags'
import { FormError, SubmitButton } from '@/components/ui'

type Field = {
  key: string
  label: string
  source: string
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'NUMBER' | 'TEXT' | 'BOOLEAN'
  options: Array<{ value: string; label: string }> | null
}

type Row = { question: string; op: string; value: string }

const OPS_BY_TYPE: Record<Field['type'], Array<[string, string]>> = {
  MULTI_CHOICE: [['includes', 'includes'], ['excludes', 'does not include'], ['blank', 'was left blank']],
  SINGLE_CHOICE: [['eq', 'is'], ['ne', 'is not'], ['blank', 'was left blank']],
  BOOLEAN: [['eq', 'is'], ['ne', 'is not']],
  NUMBER: [['gte', 'is at least'], ['gt', 'is over'], ['lte', 'is at most'], ['lt', 'is under'], ['eq', 'is exactly'], ['blank', 'was left blank']],
  TEXT: [['answered', 'was answered'], ['blank', 'was left blank'], ['eq', 'is']],
}

/**
 * A small condition builder rather than a JSON editor. A physician should be
 * able to write "conditions includes heart_disease AND bp_controlled is no"
 * without learning a syntax.
 */
export default function RuleEditor({ fields }: { fields: Field[] }) {
  const [state, action] = useActionState<FlagState, FormData>(saveFlagRule, {})
  const [rows, setRows] = useState<Row[]>([{ question: '', op: '', value: '' }])
  const [match, setMatch] = useState<'all' | 'any'>('all')

  function fieldFor(key: string) {
    return fields.find((f) => f.key === key)
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  return (
    <section className="ml-card self-start">
      <div className="ml-card-title">Add a Flag</div>
      <form action={action} className="p-5">
        <div className="ml-field">
          <label htmlFor="label">What should this flag be called?</label>
          <input id="label" name="label" className="ml-input" placeholder="History of pancreatitis" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="ml-field">
            <label htmlFor="key">Key</label>
            <input
              id="key"
              name="key"
              className="ml-input font-mono text-[13px]"
              placeholder="pancreatitis_history"
              pattern="[a-z0-9_]+"
              required
            />
          </div>
          <div className="ml-field">
            <label htmlFor="severity">Severity</label>
            <select id="severity" name="severity" className="ml-input" defaultValue="MEDIUM">
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------- conditions */}
        <div className="ml-field">
          <label>Raise this flag when</label>
          <select
            name="match"
            className="ml-input mb-2.5"
            value={match}
            onChange={(e) => setMatch(e.target.value as 'all' | 'any')}
          >
            <option value="all">all of these are true</option>
            <option value="any">any of these is true</option>
          </select>

          {rows.map((row, i) => {
            const field = fieldFor(row.question)
            const ops = field ? OPS_BY_TYPE[field.type] : []
            const needsValue = row.op !== 'answered' && row.op !== 'blank' && row.op !== ''

            return (
              <div key={i} className="ml-panel mb-2 p-3">
                <select
                  name="cond_question"
                  className="ml-input mb-2"
                  value={row.question}
                  onChange={(e) => update(i, { question: e.target.value, op: '', value: '' })}
                >
                  <option value="">Choose a question…</option>
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} — {f.source}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <select
                    name="cond_op"
                    className="ml-input"
                    value={row.op}
                    onChange={(e) => update(i, { op: e.target.value })}
                    disabled={!field}
                  >
                    <option value="">…</option>
                    {ops.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {needsValue ? (
                    field?.options ? (
                      <select
                        name="cond_value"
                        className="ml-input"
                        value={row.value}
                        onChange={(e) => update(i, { value: e.target.value })}
                      >
                        <option value="">Choose…</option>
                        {field.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name="cond_value"
                        className="ml-input"
                        value={row.value}
                        onChange={(e) => update(i, { value: e.target.value })}
                        placeholder={field?.type === 'NUMBER' ? '27' : 'value'}
                        inputMode={field?.type === 'NUMBER' ? 'decimal' : 'text'}
                      />
                    )
                  ) : (
                    <input type="hidden" name="cond_value" value="" />
                  )}
                </div>

                {rows.length > 1 ? (
                  <button
                    type="button"
                    className="ml-sub mt-2 text-[12px] underline"
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            )
          })}

          <button
            type="button"
            className="ml-btn w-full text-[13px]"
            onClick={() => setRows((prev) => [...prev, { question: '', op: '', value: '' }])}
          >
            + Add another condition
          </button>
        </div>

        <div className="ml-field">
          <label htmlFor="guidance">What should the reviewing clinician see?</label>
          <textarea
            id="guidance"
            name="guidance"
            rows={3}
            className="ml-input"
            placeholder="Protocol lists this as a contraindication. Physician review required."
          />
        </div>

        <label className="ml-check is-on mt-3">
          <input type="checkbox" name="active" className="sr-only" defaultChecked />
          <span className="ml-box" />
          Active straight away
        </label>

        <FormError message={state.error} />
        {state.ok ? <div className="ml-green mt-3 text-[13px]">Flag saved.</div> : null}

        <div className="mt-4">
          <SubmitButton pendingLabel="Saving…">Save flag</SubmitButton>
        </div>

        <p className="ml-sub mt-3 text-[11px]">
          MediLean checks the rule runs before saving it, so a broken condition cannot sit there
          silently never firing.
        </p>
      </form>
    </section>
  )
}
