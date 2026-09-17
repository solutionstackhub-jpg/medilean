/**
 * A tiny condition evaluator shared by two things the physician controls:
 *
 *   1. Question.showIf   — whether a follow-up question is shown (branching)
 *   2. FlagRule.condition — whether a clinical flag fires on a submission
 *
 * Both are stored as JSON in the database rather than written in code, because
 * the clinical protocol belongs to the physician. Changing a threshold should be
 * a form submission, not a deployment.
 *
 * Grammar:
 *   { all: [ ...conditions ] }          every child must pass
 *   { any: [ ...conditions ] }          at least one child must pass
 *   { not: condition }                  negation
 *   { question, op, value }             a leaf test against one answer
 *
 * Leaf operators: eq, ne, gt, gte, lt, lte, includes, excludes, answered, blank
 */

export type Leaf = {
  question: string
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'includes' | 'excludes' | 'answered' | 'blank'
  value?: unknown
}

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | Leaf

export type Answers = Record<string, unknown>

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (v === null || v === undefined || v === '') return []
  return [v]
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

function evalLeaf(leaf: Leaf, answers: Answers): boolean {
  const actual = answers[leaf.question]

  switch (leaf.op) {
    case 'answered':
      return !isBlank(actual)
    case 'blank':
      return isBlank(actual)
    case 'eq':
      return String(actual) === String(leaf.value)
    case 'ne':
      return String(actual) !== String(leaf.value)
    case 'includes':
      return asArray(actual).map(String).includes(String(leaf.value))
    case 'excludes':
      return !asArray(actual).map(String).includes(String(leaf.value))
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const a = asNumber(actual)
      const b = asNumber(leaf.value)
      // A missing or non-numeric answer never satisfies a numeric comparison.
      // Silence is not a clinical finding.
      if (a === null || b === null) return false
      if (leaf.op === 'gt') return a > b
      if (leaf.op === 'gte') return a >= b
      if (leaf.op === 'lt') return a < b
      return a <= b
    }
    default:
      return false
  }
}

export function evaluate(condition: Condition | null | undefined, answers: Answers): boolean {
  // No condition means "always". Used by questions that are never branched away.
  if (!condition) return true

  if ('all' in condition) return condition.all.every((c) => evaluate(c, answers))
  if ('any' in condition) return condition.any.some((c) => evaluate(c, answers))
  if ('not' in condition) return !evaluate(condition.not, answers)

  return evalLeaf(condition as Leaf, answers)
}

/** Human-readable rendering, so the admin screen can show a rule without a JSON editor. */
export function describe(condition: Condition | null | undefined, depth = 0): string {
  if (!condition) return 'always'

  if ('all' in condition) {
    return condition.all.map((c) => describe(c, depth + 1)).join(' AND ')
  }
  if ('any' in condition) {
    const inner = condition.any.map((c) => describe(c, depth + 1)).join(' OR ')
    return depth > 0 ? `(${inner})` : inner
  }
  if ('not' in condition) return `NOT ${describe(condition.not, depth + 1)}`

  const leaf = condition as Leaf
  const ops: Record<Leaf['op'], string> = {
    eq: 'is',
    ne: 'is not',
    gt: 'is over',
    gte: 'is at least',
    lt: 'is under',
    lte: 'is at most',
    includes: 'includes',
    excludes: 'does not include',
    answered: 'was answered',
    blank: 'was left blank',
  }
  const tail = leaf.op === 'answered' || leaf.op === 'blank' ? '' : ` ${String(leaf.value)}`
  return `${leaf.question} ${ops[leaf.op]}${tail}`
}

/** Which questions should be visible, in order, given the answers so far. */
export function visibleQuestions<T extends { key: string; showIf?: unknown }>(
  questions: T[],
  answers: Answers,
): T[] {
  return questions.filter((q) => evaluate(q.showIf as Condition | null, answers))
}
