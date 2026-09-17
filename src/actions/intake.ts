'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireVerifiedPatient } from '@/lib/auth'
import { encryptJson } from '@/lib/crypto'
import { evaluateFlags, loadAnswers } from '@/lib/clinical'
import { visibleQuestions, type Answers, type Condition } from '@/lib/rules'

/** Find or start the patient's working submission for a questionnaire. */
export async function getOrCreateSubmission(patientId: string, questionnaireKey: string) {
  const questionnaire = await prisma.questionnaire.findFirst({
    where: { key: questionnaireKey, active: true },
    orderBy: { version: 'desc' },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!questionnaire) throw new Error(`No active questionnaire "${questionnaireKey}"`)

  let submission = await prisma.submission.findFirst({
    where: { patientId, questionnaireId: questionnaire.id, status: { in: ['DRAFT', 'NEEDS_INFO'] } },
    orderBy: { createdAt: 'desc' },
  })

  if (!submission) {
    submission = await prisma.submission.create({
      data: { patientId, questionnaireId: questionnaire.id, status: 'DRAFT' },
    })
  }

  return { questionnaire, submission }
}

/**
 * Store what the patient has answered so far.
 *
 * Only questions that are actually visible under the branching rules are kept,
 * so an answer to a question the patient never saw cannot be posted, and a
 * question that branched away does not linger on the chart. The browser decides
 * what to show; the server decides what is accepted.
 */
export async function saveIntakeDraft(
  questionnaireKey: string,
  answers: Answers,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireVerifiedPatient()
  const { questionnaire, submission } = await getOrCreateSubmission(session.userId, questionnaireKey)

  const visible = visibleQuestions(
    questionnaire.questions.map((q) => ({ ...q, showIf: q.showIf as Condition | null })),
    answers,
  )
  const visibleKeys = new Set(visible.map((q) => q.key))

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

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'submission.save_draft',
    entity: 'Submission',
    entityId: submission.id,
    patientId: session.userId,
    meta: { questionnaire: questionnaireKey, answered: visibleKeys.size },
  })

  revalidatePath('/intake')
  return { ok: true }
}

/** Save, then send the patient to read their answers back before submitting. */
export async function saveAndReview(questionnaireKey: string, answers: Answers): Promise<void> {
  const result = await saveIntakeDraft(questionnaireKey, answers)
  if (!result.ok) return
  redirect('/intake/review')
}

/**
 * Submit for clinician review.
 *
 * Required answers are re-checked here, not only in the browser. Flag rules run
 * afterwards: they raise warnings for a human to read and never approve,
 * decline or prescribe anything.
 */
export async function submitIntake(): Promise<{ ok: boolean; error?: string }> {
  const session = await requireVerifiedPatient()
  const { questionnaire, submission } = await getOrCreateSubmission(session.userId, 'intake')
  const answers = await loadAnswers(submission.id)

  const visible = visibleQuestions(
    questionnaire.questions.map((q) => ({ ...q, showIf: q.showIf as Condition | null })),
    answers,
  )
  const missing = visible.filter((q) => {
    if (!q.required) return false
    const v = answers[q.key]
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
  })
  if (missing.length) {
    return { ok: false, error: `Still needed: ${missing.map((m) => m.label).join(', ')}` }
  }

  // Record the reported weight so the progress chart starts from day one.
  const weight = Number(answers['weight_lb'])
  if (Number.isFinite(weight) && weight > 0) {
    await prisma.weightEntry.create({
      data: { patientId: session.userId, weightLb: weight, source: 'intake' },
    })
    const profile = await prisma.patientProfile.findUnique({ where: { userId: session.userId } })
    await prisma.patientProfile.update({
      where: { userId: session.userId },
      data: {
        startingWeightLb: profile?.startingWeightLb ?? weight,
        goalWeightLb: Number(answers['goal_weight_lb']) || profile?.goalWeightLb || null,
        heightInches: Number(answers['height_in']) || profile?.heightInches || null,
      },
    })
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  const result = await evaluateFlags(submission.id)

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'submission.submit',
    entity: 'Submission',
    entityId: submission.id,
    patientId: session.userId,
    meta: { ...result, answered: Object.keys(answers).length },
  })

  redirect('/intake/complete')
}
