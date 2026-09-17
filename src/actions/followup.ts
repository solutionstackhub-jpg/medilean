'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireVerifiedPatient } from '@/lib/auth'
import { encryptJson } from '@/lib/crypto'
import { evaluateFlags } from '@/lib/clinical'
import { visibleQuestions, type Answers } from '@/lib/rules'

/**
 * Recurring follow-up check-ins.
 *
 * Same engine as the intake: the physician's questions, the physician's
 * branching, the physician's flag rules. What differs is that finishing one
 * moves the schedule forward and, if a flag fires, pushes the case back into
 * the review queue instead of filing a report nobody opens.
 */
export async function startFollowUp(): Promise<{ submissionId: string } | null> {
  const session = await requireVerifiedPatient()

  const schedule = await prisma.followUpSchedule.findFirst({
    where: { patientId: session.userId, active: true },
    orderBy: { nextDueAt: 'asc' },
    include: { questionnaire: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })
  if (!schedule) return null

  let submission = await prisma.submission.findFirst({
    where: {
      patientId: session.userId,
      questionnaireId: schedule.questionnaireId,
      status: { in: ['DRAFT', 'NEEDS_INFO'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!submission) {
    submission = await prisma.submission.create({
      data: { patientId: session.userId, questionnaireId: schedule.questionnaireId, status: 'DRAFT' },
    })
  }

  return { submissionId: submission.id }
}

export async function saveFollowUp(
  answers: Answers,
  finalSubmit: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireVerifiedPatient()

  const schedule = await prisma.followUpSchedule.findFirst({
    where: { patientId: session.userId, active: true },
    orderBy: { nextDueAt: 'asc' },
    include: { questionnaire: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })
  if (!schedule) return { ok: false, error: 'No check-in is scheduled.' }

  const submission = await prisma.submission.findFirst({
    where: {
      patientId: session.userId,
      questionnaireId: schedule.questionnaireId,
      status: { in: ['DRAFT', 'NEEDS_INFO'] },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!submission) return { ok: false, error: 'Start the check-in again.' }

  const visible = visibleQuestions(schedule.questionnaire.questions, answers)
  const visibleKeys = new Set(visible.map((q) => q.key))

  if (finalSubmit) {
    const missing = visible.filter((q) => {
      if (!q.required) return false
      const v = answers[q.key]
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
    })
    if (missing.length) {
      return { ok: false, error: `Please answer: ${missing.map((m) => m.label).join(', ')}` }
    }
  }

  await prisma.answer.deleteMany({ where: { submissionId: submission.id } })
  await prisma.answer.createMany({
    data: Object.entries(answers)
      .filter(([key]) => visibleKeys.has(key))
      .map(([questionKey, value]) => ({
        submissionId: submission.id,
        questionKey,
        valueEnc: encryptJson(value),
      })),
  })

  if (!finalSubmit) {
    await audit({
      actorId: session.userId,
      actorRole: session.role,
      action: 'followup.save_draft',
      entity: 'Submission',
      entityId: submission.id,
      patientId: session.userId,
    })
    return { ok: true }
  }

  const weight = Number(answers['weight_lb'])
  if (Number.isFinite(weight) && weight > 0) {
    await prisma.weightEntry.create({
      data: { patientId: session.userId, weightLb: weight, source: 'follow_up' },
    })
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  const result = await evaluateFlags(submission.id)

  // Move the schedule on regardless of whether anything fired, so a patient is
  // never asked the same check-in twice.
  await prisma.followUpSchedule.update({
    where: { id: schedule.id },
    data: {
      lastCompletedAt: new Date(),
      nextDueAt: new Date(Date.now() + schedule.intervalDays * 864e5),
    },
  })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'followup.submit',
    entity: 'Submission',
    entityId: submission.id,
    patientId: session.userId,
    meta: { ...result, nextInDays: schedule.intervalDays },
  })

  redirect('/questionnaires?done=1')
}
