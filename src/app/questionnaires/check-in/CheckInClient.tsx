'use client'

import QuestionnaireForm, { type QuestionDto } from '@/components/QuestionnaireForm'
import { saveFollowUp } from '@/actions/followup'
import type { Answers } from '@/lib/rules'

export default function CheckInClient(props: {
  title: string
  subtitle: string | null
  questions: QuestionDto[]
  initialAnswers: Answers
}) {
  return (
    <QuestionnaireForm
      {...props}
      submitLabel="Submit check-in"
      onSave={async (answers) => saveFollowUp(answers, false)}
      onFinish={async (answers) => saveFollowUp(answers, true)}
    />
  )
}
