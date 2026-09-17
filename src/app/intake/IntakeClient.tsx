'use client'

import QuestionnaireForm, { type QuestionDto } from '@/components/QuestionnaireForm'
import { saveIntakeDraft, saveAndReview } from '@/actions/intake'
import type { Answers } from '@/lib/rules'

export default function IntakeClient(props: {
  title: string
  subtitle: string | null
  questions: QuestionDto[]
  initialAnswers: Answers
}) {
  return (
    <QuestionnaireForm
      {...props}
      submitLabel="Review my answers →"
      onSave={async (answers) => saveIntakeDraft('intake', answers)}
      onFinish={async (answers) => saveAndReview('intake', answers)}
    />
  )
}
