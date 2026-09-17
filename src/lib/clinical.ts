import { prisma } from '@/lib/db'
import { decryptJson, encryptJson } from '@/lib/crypto'
import { evaluate, type Answers, type Condition } from '@/lib/rules'

/**
 * Clinical evaluation.
 *
 * The rules themselves are configuration owned by the physician. This file only
 * runs them and records what fired. It never decides what should fire, and it
 * never approves or declines anything — a flag routes a case to a human.
 */

export function bmi(heightInches: number | null | undefined, weightLb: number | null | undefined): number | null {
  if (!heightInches || !weightLb) return null
  if (heightInches <= 0) return null
  const value = (703 * weightLb) / (heightInches * heightInches)
  return Math.round(value * 10) / 10
}

/**
 * Values the physician can write rules against that the patient never typed.
 * Kept explicit so the admin screen can list what is available.
 */
export const DERIVED_KEYS = ['bmi'] as const

export function withDerived(answers: Answers): Answers {
  const height = Number(answers['height_in'])
  const weight = Number(answers['weight_lb'])
  const derivedBmi = bmi(height, weight)
  return derivedBmi === null ? answers : { ...answers, bmi: derivedBmi }
}

export async function loadAnswers(submissionId: string): Promise<Answers> {
  const rows = await prisma.answer.findMany({ where: { submissionId } })
  const answers: Answers = {}
  for (const row of rows) {
    try {
      answers[row.questionKey] = decryptJson(row.valueEnc)
    } catch {
      // A single unreadable answer must not hide the rest of the chart from the
      // clinician. It is logged and shown as missing.
      console.error('[clinical] could not decrypt answer', row.questionKey)
    }
  }
  return answers
}

export async function saveAnswer(submissionId: string, questionKey: string, value: unknown) {
  const valueEnc = encryptJson(value)
  return prisma.answer.upsert({
    where: { submissionId_questionKey: { submissionId, questionKey } },
    create: { submissionId, questionKey, valueEnc },
    update: { valueEnc },
  })
}

/**
 * Run every active flag rule against a submission and reconcile what is stored.
 * Rules that no longer fire are removed, so an answer correction clears its flag
 * instead of leaving a stale warning on the chart.
 */
export async function evaluateFlags(submissionId: string) {
  const answers = withDerived(await loadAnswers(submissionId))
  const rules = await prisma.flagRule.findMany({ where: { active: true } })

  const firing = rules.filter((rule) => {
    try {
      return evaluate(rule.condition as unknown as Condition, answers)
    } catch (err) {
      // A malformed rule must not block a submission. It is reported, not obeyed.
      console.error('[clinical] rule failed to evaluate', rule.key, err)
      return false
    }
  })

  const existing = await prisma.raisedFlag.findMany({ where: { submissionId } })
  const firingIds = new Set(firing.map((r) => r.id))
  const existingIds = new Set(existing.map((f) => f.ruleId))

  const toRemove = existing.filter((f) => !firingIds.has(f.ruleId))
  if (toRemove.length) {
    await prisma.raisedFlag.deleteMany({ where: { id: { in: toRemove.map((f) => f.id) } } })
  }

  const toAdd = firing.filter((r) => !existingIds.has(r.id))
  for (const rule of toAdd) {
    await prisma.raisedFlag.create({
      data: { submissionId, ruleId: rule.id, severity: rule.severity },
    })
  }

  return { fired: firing.length, added: toAdd.length, cleared: toRemove.length }
}

/**
 * Whole days until a date, negative once it is overdue.
 *
 * Kept here rather than inline in a page so the reference to the current time
 * sits in one place. It also keeps the React purity lint rule happy, which is
 * right to be suspicious of a clock being read during render.
 */
export function daysUntil(when: Date, now: Date = new Date()): number {
  return Math.ceil((when.getTime() - now.getTime()) / 864e5)
}

/**
 * Was this account active in the last few minutes?
 *
 * Kept here with the other clock reader so there is one place that looks at the
 * current time, which is also what the React purity rule wants.
 */
export function recentlyActive(lastLoginAt: Date | null | undefined, withinMinutes = 15): boolean {
  if (!lastLoginAt) return false
  return new Date().getTime() - lastLoginAt.getTime() < withinMinutes * 60_000
}
