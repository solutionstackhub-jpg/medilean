'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireRole } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'
import type { SubmissionStatus } from '@/generated/prisma/enums'

export type ReviewState = { error?: string; ok?: boolean }

/**
 * Record clinical documentation and move a case along.
 *
 * The physician decides; this only records the decision and who made it. A
 * status change without a note is refused, because six months later "approved"
 * with no reasoning is not a record anybody can defend.
 */
const decisionSchema = z.object({
  submissionId: z.string().min(1),
  status: z.enum(['IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'DECLINED']),
  note: z.string().trim().min(10, 'Add a short note explaining the decision.'),
  medication: z.string().trim().optional(),
  dose: z.string().trim().optional(),
  schedule: z.string().trim().optional(),
})

export async function recordDecision(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const session = await requireRole('PHYSICIAN')

  const parsed = decisionSchema.safeParse({
    submissionId: String(formData.get('submissionId') ?? ''),
    status: String(formData.get('status') ?? ''),
    note: String(formData.get('note') ?? ''),
    medication: String(formData.get('medication') ?? ''),
    dose: String(formData.get('dose') ?? ''),
    schedule: String(formData.get('schedule') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Approving is the moment a plan exists. Asking for it here, rather than on a
  // separate screen, keeps the decision and what was decided in one record.
  if (parsed.data.status === 'APPROVED' && !parsed.data.medication) {
    return { error: 'Name the treatment you are approving.' }
  }

  const submission = await prisma.submission.findUnique({
    where: { id: parsed.data.submissionId },
    select: { id: true, patientId: true, status: true },
  })
  if (!submission) return { error: 'That case no longer exists.' }

  await prisma.$transaction([
    prisma.clinicalNote.create({
      data: {
        submissionId: submission.id,
        patientId: submission.patientId,
        physicianId: session.userId,
        bodyEnc: encrypt(parsed.data.note),
      },
    }),
    prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: parsed.data.status as SubmissionStatus,
        reviewedAt: new Date(),
        reviewedById: session.userId,
      },
    }),
  ])

  if (parsed.data.status === 'APPROVED') {
    await prisma.treatmentPlan.upsert({
      where: { patientId: submission.patientId },
      create: {
        patientId: submission.patientId,
        prescribedById: session.userId,
        medicationEnc: encrypt(parsed.data.medication!),
        doseEnc: parsed.data.dose ? encrypt(parsed.data.dose) : null,
        scheduleEnc: parsed.data.schedule ? encrypt(parsed.data.schedule) : null,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
      update: {
        prescribedById: session.userId,
        medicationEnc: encrypt(parsed.data.medication!),
        doseEnc: parsed.data.dose ? encrypt(parsed.data.dose) : null,
        scheduleEnc: parsed.data.schedule ? encrypt(parsed.data.schedule) : null,
        status: 'ACTIVE',
        startedAt: new Date(),
        endedAt: null,
      },
    })
    await audit({
      actorId: session.userId,
      actorRole: session.role,
      action: 'treatment_plan.set',
      entity: 'TreatmentPlan',
      patientId: submission.patientId,
      meta: { hasDose: Boolean(parsed.data.dose), hasSchedule: Boolean(parsed.data.schedule) },
    })
  }

  if (parsed.data.status === 'DECLINED') {
    await prisma.treatmentPlan.updateMany({
      where: { patientId: submission.patientId, status: 'ACTIVE' },
      data: { status: 'ENDED', endedAt: new Date() },
    })
  }

  // The patient is told that something changed, never what. The clinical
  // content stays behind the login.
  await prisma.notification.create({
    data: {
      userId: submission.patientId,
      channel: 'EMAIL',
      templateKey: parsed.data.status === 'NEEDS_INFO' ? 'action_needed' : 'review_complete',
      deliveredAt: new Date(),
    },
  })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'submission.decision',
    entity: 'Submission',
    entityId: submission.id,
    patientId: submission.patientId,
    meta: { from: submission.status, to: parsed.data.status },
  })

  revalidatePath(`/physician/patients/${submission.id}`)
  revalidatePath('/physician')
  return { ok: true }
}

export async function resolveFlag(formData: FormData): Promise<void> {
  const session = await requireRole('PHYSICIAN')
  const flagId = String(formData.get('flagId') ?? '')

  const flag = await prisma.raisedFlag.findUnique({
    where: { id: flagId },
    select: { id: true, submission: { select: { id: true, patientId: true } }, rule: { select: { key: true } } },
  })
  if (!flag) return

  await prisma.raisedFlag.update({
    where: { id: flag.id },
    data: { resolvedAt: new Date(), resolvedById: session.userId },
  })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'flag.acknowledged',
    entity: 'RaisedFlag',
    entityId: flag.id,
    patientId: flag.submission.patientId,
    meta: { rule: flag.rule.key },
  })

  revalidatePath(`/physician/patients/${flag.submission.id}`)
}
