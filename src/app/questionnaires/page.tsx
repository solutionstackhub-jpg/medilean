import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import { unreadForPatient } from '@/lib/physician'
import { Banner } from '@/components/ui'
import { daysUntil } from '@/lib/clinical'

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Not finished', tone: 'is-grey' },
  SUBMITTED: { label: 'With your care team', tone: '' },
  IN_REVIEW: { label: 'Being reviewed', tone: 'is-yellow' },
  NEEDS_INFO: { label: 'Needs your attention', tone: 'is-red' },
  APPROVED: { label: 'Complete', tone: '' },
  DECLINED: { label: 'Closed', tone: 'is-grey' },
}

export default async function QuestionnairesPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>
}) {
  const session = await requireVerifiedPatient()
  const { done } = await searchParams

  const [me, submissions, schedule] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    prisma.submission.findMany({
      where: { patientId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { questionnaire: true, _count: { select: { flags: true } } },
    }),
    prisma.followUpSchedule.findFirst({
      where: { patientId: session.userId, active: true },
      orderBy: { nextDueAt: 'asc' },
      include: { questionnaire: true },
    }),
  ])

  const dueInDays = schedule ? daysUntil(schedule.nextDueAt) : null
  const due = dueInDays !== null && dueInDays <= 0

  return (
    <AppShell
      nav={PATIENT_NAV}
      active="/questionnaires"
      role={session.role}
      userName={me.fullName}
      roleLabel="Patient"
      notifications={await unreadForPatient(session.userId)}
      notificationsHref="/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Questionnaires</h2>
          <div className="ml-sub">Your intake and your regular check-ins.</div>
        </>
      }
    >
      {done ? (
        <div className="mb-4">
          <Banner>
            Check-in received. If anything in it needs a clinician&apos;s attention, it has already
            been routed to them.
          </Banner>
        </div>
      ) : null}

      <section className="ml-card mb-3">
        <div className="ml-card-title">Next Check-in</div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-[17px] font-bold">
              {schedule?.questionnaire.title ?? 'Nothing scheduled'}
            </div>
            <div className="ml-sub mt-1">
              {schedule
                ? due
                  ? 'Due now.'
                  : `Due in ${dueInDays} day${dueInDays === 1 ? '' : 's'}, on ${schedule.nextDueAt.toLocaleDateString()}.`
                : 'A check-in is scheduled once your plan starts.'}
              {schedule?.lastCompletedAt
                ? ` Last completed ${schedule.lastCompletedAt.toLocaleDateString()}.`
                : ''}
            </div>
          </div>
          {schedule ? (
            <Link
              href="/questionnaires/check-in"
              className={`ml-btn no-underline ${due ? 'ml-btn-primary' : ''}`}
            >
              {due ? 'Start check-in →' : 'Start early'}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="ml-card">
        <div className="ml-card-title">History</div>
        <div className="p-5">
          {submissions.length === 0 ? (
            <div className="ml-sub">Nothing submitted yet.</div>
          ) : (
            submissions.map((s) => {
              const copy = STATUS_COPY[s.status]
              return (
                <div key={s.id} className="ml-file">
                  <div className="min-w-0">
                    <div className="truncate text-[14px]">{s.questionnaire.title}</div>
                    <div className="ml-sub text-[11px]">
                      {s.submittedAt
                        ? `Submitted ${s.submittedAt.toLocaleDateString()}`
                        : `Started ${s.createdAt.toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`ml-pill ${copy.tone}`}>{copy.label}</span>
                    {s.status === 'NEEDS_INFO' || s.status === 'DRAFT' ? (
                      <Link
                        href={s.questionnaire.type === 'INTAKE' ? '/intake' : '/questionnaires/check-in'}
                        className="ml-btn-review no-underline"
                      >
                        Continue
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <p className="ml-sub mt-5 text-[11px]">
        Flags raised by a check-in are for your care team to read. Nothing here changes your
        treatment on its own.
      </p>
    </AppShell>
  )
}
