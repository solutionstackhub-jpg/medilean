import { describe, expect, it } from 'vitest'
import { evaluate, describe as explain, visibleQuestions, type Condition } from '@/lib/rules'

/**
 * The rules engine decides which questions a patient sees and which clinical
 * flags reach a physician. These are the tests that matter most in this
 * codebase: a wrong answer here either hides a question a clinician needed or
 * raises noise that trains them to ignore flags.
 */

describe('leaf operators', () => {
  it('matches equality as strings so "4_plus" and 4 both work', () => {
    expect(evaluate({ question: 'a', op: 'eq', value: 'yes' }, { a: 'yes' })).toBe(true)
    expect(evaluate({ question: 'a', op: 'eq', value: 4 }, { a: '4' })).toBe(true)
    expect(evaluate({ question: 'a', op: 'ne', value: 'yes' }, { a: 'no' })).toBe(true)
  })

  it('handles multi-choice membership', () => {
    const answers = { conditions: ['high_bp', 'thyroid'] }
    expect(evaluate({ question: 'conditions', op: 'includes', value: 'thyroid' }, answers)).toBe(true)
    expect(evaluate({ question: 'conditions', op: 'includes', value: 'diabetes_t2' }, answers)).toBe(false)
    expect(evaluate({ question: 'conditions', op: 'excludes', value: 'diabetes_t2' }, answers)).toBe(true)
  })

  it('treats a single value as a one-item list for includes', () => {
    expect(evaluate({ question: 'c', op: 'includes', value: 'x' }, { c: 'x' })).toBe(true)
  })

  it('compares numbers numerically, not lexically', () => {
    expect(evaluate({ question: 'n', op: 'gte', value: 14 }, { n: 9 })).toBe(false)
    expect(evaluate({ question: 'n', op: 'gte', value: 14 }, { n: 16 })).toBe(true)
    // "9" > "14" as strings; it must not be true here.
    expect(evaluate({ question: 'n', op: 'gt', value: '14' }, { n: '9' })).toBe(false)
  })

  it('never satisfies a numeric comparison from a missing answer', () => {
    // Silence is not a clinical finding. An unanswered BMI must not fire
    // "BMI is under 27".
    expect(evaluate({ question: 'bmi', op: 'lt', value: 27 }, {})).toBe(false)
    expect(evaluate({ question: 'bmi', op: 'lt', value: 27 }, { bmi: '' })).toBe(false)
    expect(evaluate({ question: 'bmi', op: 'lt', value: 27 }, { bmi: 'unknown' })).toBe(false)
  })

  it('distinguishes answered from blank', () => {
    expect(evaluate({ question: 'x', op: 'blank' }, {})).toBe(true)
    expect(evaluate({ question: 'x', op: 'blank' }, { x: [] })).toBe(true)
    expect(evaluate({ question: 'x', op: 'blank' }, { x: '  ' })).toBe(true)
    expect(evaluate({ question: 'x', op: 'answered' }, { x: 'no' })).toBe(true)
  })
})

describe('combinators', () => {
  const uncontrolledHypertension: Condition = {
    all: [
      { question: 'conditions', op: 'includes', value: 'high_bp' },
      { question: 'bp_controlled', op: 'eq', value: 'no' },
    ],
  }

  it('requires every branch of all', () => {
    expect(evaluate(uncontrolledHypertension, { conditions: ['high_bp'], bp_controlled: 'no' })).toBe(true)
    expect(evaluate(uncontrolledHypertension, { conditions: ['high_bp'], bp_controlled: 'yes' })).toBe(false)
    expect(evaluate(uncontrolledHypertension, { conditions: ['thyroid'], bp_controlled: 'no' })).toBe(false)
  })

  it('requires one branch of any', () => {
    const pregnancy: Condition = {
      any: [
        { question: 'pregnancy_status', op: 'eq', value: 'pregnant' },
        { question: 'pregnancy_status', op: 'eq', value: 'planning' },
      ],
    }
    expect(evaluate(pregnancy, { pregnancy_status: 'planning' })).toBe(true)
    expect(evaluate(pregnancy, { pregnancy_status: 'no' })).toBe(false)
  })

  it('negates', () => {
    expect(evaluate({ not: { question: 'a', op: 'eq', value: 'yes' } }, { a: 'no' })).toBe(true)
  })

  it('treats a missing condition as always true', () => {
    expect(evaluate(null, {})).toBe(true)
    expect(evaluate(undefined, {})).toBe(true)
  })
})

describe('branching', () => {
  const questions = [
    { key: 'conditions', showIf: null },
    { key: 'diabetes_meds', showIf: { question: 'conditions', op: 'includes', value: 'diabetes_t2' } },
    { key: 'bp_controlled', showIf: { question: 'conditions', op: 'includes', value: 'high_bp' } },
    { key: 'pregnancy_status', showIf: null },
  ]

  it('reveals follow-up questions only when the trigger is selected', () => {
    const keys = visibleQuestions(questions, { conditions: ['diabetes_t2'] }).map((q) => q.key)
    expect(keys).toEqual(['conditions', 'diabetes_meds', 'pregnancy_status'])
  })

  it('hides them again when the trigger is removed', () => {
    const keys = visibleQuestions(questions, { conditions: ['none'] }).map((q) => q.key)
    expect(keys).toEqual(['conditions', 'pregnancy_status'])
  })

  it('shows several branches at once', () => {
    const keys = visibleQuestions(questions, { conditions: ['diabetes_t2', 'high_bp'] }).map((q) => q.key)
    expect(keys).toEqual(['conditions', 'diabetes_meds', 'bp_controlled', 'pregnancy_status'])
  })
})

describe('plain-English rendering', () => {
  it('reads back a rule the way the admin screen shows it', () => {
    expect(
      explain({
        all: [
          { question: 'conditions', op: 'includes', value: 'high_bp' },
          { question: 'bp_controlled', op: 'eq', value: 'no' },
        ],
      }),
    ).toBe('conditions includes high_bp AND bp_controlled is no')

    expect(explain({ question: 'bmi', op: 'lt', value: 27 })).toBe('bmi is under 27')
    expect(explain({ question: 'x', op: 'answered' })).toBe('x was answered')
  })

  it('brackets a nested any so precedence is visible', () => {
    const c: Condition = {
      all: [
        { question: 'a', op: 'eq', value: '1' },
        { any: [{ question: 'b', op: 'eq', value: '2' }, { question: 'c', op: 'eq', value: '3' }] },
      ],
    }
    expect(explain(c)).toBe('a is 1 AND (b is 2 OR c is 3)')
  })
})
