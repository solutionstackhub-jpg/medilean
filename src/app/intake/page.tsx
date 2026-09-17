import { requireVerifiedPatient } from '@/lib/auth'
import { getOrCreateSubmission } from '@/actions/intake'
import { loadAnswers } from '@/lib/clinical'
import OnboardShell from '@/components/OnboardShell'
import IntakeClient from './IntakeClient'
import type { QuestionDto } from '@/components/QuestionnaireForm'

export default async function IntakePage() {
  const session = await requireVerifiedPatient()
  const { questionnaire, submission } = await getOrCreateSubmission(session.userId, 'intake')
  const answers = await loadAnswers(submission.id)

  const questions: QuestionDto[] = questionnaire.questions.map((q) => ({
    key: q.key,
    label: q.label,
    helpText: q.helpText,
    type: q.type,
    required: q.required,
    options: (q.options as QuestionDto['options']) ?? null,
    showIf: (q.showIf as QuestionDto['showIf']) ?? null,
    order: q.order,
  }))

  return (
    <OnboardShell step={3} title="" subtitle="" showAside={false} rail="intake">
      <IntakeClient
        title={questionnaire.title}
        subtitle={questionnaire.subtitle}
        questions={questions}
        initialAnswers={answers}
      />
    </OnboardShell>
  )
}
