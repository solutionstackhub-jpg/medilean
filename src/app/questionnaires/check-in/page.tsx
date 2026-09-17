import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { loadAnswers } from '@/lib/clinical'
import { startFollowUp } from '@/actions/followup'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import { unreadForPatient } from '@/lib/physician'
import { Banner } from '@/components/ui'
import CheckInClient from './CheckInClient'
import type { QuestionDto } from '@/components/QuestionnaireForm'

export default async function CheckInPage() {
  const session = await requireVerifiedPatient()
  const me = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } })

  const started = await startFollowUp()
  const schedule = await prisma.followUpSchedule.findFirst({
    where: { patientId: session.userId, active: true },
    orderBy: { nextDueAt: 'asc' },
    include: { questionnaire: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })

  const unread = await unreadForPatient(session.userId)

  const shell = (children: React.ReactNode) => (
    <AppShell
      nav={PATIENT_NAV}
      active="/questionnaires"
      role={session.role}
      userName={me.fullName}
      roleLabel="Patient"
      notifications={unread}
      notificationsHref="/messages"
      toolbar={<h2 className="text-[22px] font-bold">Check-in</h2>}
    >
      {children}
    </AppShell>
  )

  if (!started || !schedule) {
    return shell(<Banner>No check-in is scheduled for you at the moment.</Banner>)
  }

  const answers = await loadAnswers(started.submissionId)
  const questions: QuestionDto[] = schedule.questionnaire.questions.map((q) => ({
    key: q.key,
    label: q.label,
    helpText: q.helpText,
    type: q.type,
    required: q.required,
    options: (q.options as QuestionDto['options']) ?? null,
    showIf: (q.showIf as QuestionDto['showIf']) ?? null,
    order: q.order,
  }))

  return shell(
    <section className="ml-card p-6 max-[560px]:p-4">
      <CheckInClient
        title={schedule.questionnaire.title}
        subtitle={schedule.questionnaire.subtitle}
        questions={questions}
        initialAnswers={answers}
      />
    </section>,
  )
}
