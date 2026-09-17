'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireRole } from '@/lib/auth'
import { evaluate, type Condition, type Leaf } from '@/lib/rules'

export type FlagState = { error?: string; ok?: boolean }

const leafSchema = z.object({
  question: z.string().min(1),
  op: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'includes', 'excludes', 'answered', 'blank']),
  value: z.string().optional(),
})

const ruleSchema = z.object({
  id: z.string().optional(),
  key: z.string().regex(/^[a-z0-9_]+$/, 'Use lower case letters, numbers and underscores.'),
  label: z.string().trim().min(3, 'Give the flag a name a clinician will recognise.'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  guidance: z.string().trim().optional(),
  match: z.enum(['all', 'any']),
  active: z.boolean(),
})

function buildCondition(match: 'all' | 'any', leaves: Leaf[]): Condition {
  if (leaves.length === 1) return leaves[0]
  return match === 'all' ? { all: leaves } : { any: leaves }
}

/** Numbers must stay numbers or `gte 14` would compare strings. */
function coerce(op: Leaf['op'], raw?: string): unknown {
  if (op === 'answered' || op === 'blank') return undefined
  if (raw === undefined || raw === '') return ''
  if (['gt', 'gte', 'lt', 'lte'].includes(op)) {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  return raw
}

export async function saveFlagRule(_prev: FlagState, formData: FormData): Promise<FlagState> {
  const session = await requireRole('ADMIN', 'PHYSICIAN')

  const parsed = ruleSchema.safeParse({
    id: String(formData.get('id') ?? '') || undefined,
    key: String(formData.get('key') ?? '').trim(),
    label: String(formData.get('label') ?? ''),
    severity: String(formData.get('severity') ?? 'MEDIUM'),
    guidance: String(formData.get('guidance') ?? ''),
    match: String(formData.get('match') ?? 'all'),
    active: formData.get('active') === 'on',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const questions = formData.getAll('cond_question').map(String)
  const ops = formData.getAll('cond_op').map(String)
  const values = formData.getAll('cond_value').map(String)

  const leaves: Leaf[] = []
  for (let i = 0; i < questions.length; i++) {
    if (!questions[i]) continue
    const leaf = leafSchema.safeParse({ question: questions[i], op: ops[i], value: values[i] })
    if (!leaf.success) return { error: 'One of the conditions is incomplete.' }
    const op = leaf.data.op as Leaf['op']
    const value = coerce(op, leaf.data.value)
    if (op !== 'answered' && op !== 'blank' && (value === '' || value === undefined)) {
      return { error: `Give a value to compare "${leaf.data.question}" against.` }
    }
    leaves.push(value === undefined ? { question: leaf.data.question, op } : { question: leaf.data.question, op, value })
  }

  if (leaves.length === 0) return { error: 'A flag needs at least one condition.' }

  const condition = buildCondition(parsed.data.match, leaves)

  // A rule that throws would silently never fire. Prove it runs before saving.
  try {
    evaluate(condition, {})
  } catch {
    return { error: 'That condition could not be evaluated. Check the operators.' }
  }

  const data = {
    key: parsed.data.key,
    label: parsed.data.label,
    severity: parsed.data.severity,
    guidance: parsed.data.guidance || null,
    active: parsed.data.active,
    condition: condition as never,
  }

  const existingKey = await prisma.flagRule.findUnique({ where: { key: parsed.data.key } })
  if (existingKey && existingKey.id !== parsed.data.id) {
    return { error: `The key "${parsed.data.key}" is already used by another flag.` }
  }

  const saved = parsed.data.id
    ? await prisma.flagRule.update({ where: { id: parsed.data.id }, data })
    : await prisma.flagRule.create({ data })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: parsed.data.id ? 'flag_rule.update' : 'flag_rule.create',
    entity: 'FlagRule',
    entityId: saved.id,
    meta: { key: saved.key, severity: saved.severity, active: saved.active },
  })

  revalidatePath('/admin/flags')
  return { ok: true }
}

export async function toggleFlagRule(formData: FormData): Promise<void> {
  const session = await requireRole('ADMIN', 'PHYSICIAN')
  const id = String(formData.get('id') ?? '')

  const rule = await prisma.flagRule.findUnique({ where: { id } })
  if (!rule) return

  await prisma.flagRule.update({ where: { id }, data: { active: !rule.active } })
  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'flag_rule.toggle',
    entity: 'FlagRule',
    entityId: id,
    meta: { key: rule.key, active: !rule.active },
  })

  revalidatePath('/admin/flags')
}
