import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { physicianChrome } from '@/lib/physician'
import { daysUntil } from '@/lib/clinical'
import AppShell, { physicianNav } from '@/components/AppShell'

/**
 * Scheduled follow-ups, grouped by when they fall due. Asynchronous care has no
 * appointment book, so what a clinician actually needs to see here is which
 * check-ins are coming and which have gone past their date.
 */
export default async function CalendarPage() {
  const session = await requireRole('PHYSICIAN')
  const { me, pending, flagged, unread } = await physicianChrome()

  const schedules = await prisma.followUpSchedule.findMany({
    where: { active: true },
    orderBy: { nextDueAt: 'asc' },
    include: {
      questionnaire: { select: { title: true } },
      patient: { select: { id: true, fullName: true, submissions: { select: { id: true }, orderBy: { createdAt: 'desc' }, take: 1 } } },
    },
  })

  await audit({ actorId: session.userId, actorRole: session.role, action: 'calendar.view', entity: 'FollowUpSchedule', meta: { count: schedules.length } })

  const buckets: Array<{ title: string; note: string; rows: typeof schedules }> = [
    { title: 'Overdue', note: 'Past the date the check-in was due.', rows: [] },
    { title: 'This week', note: 'Due in the next seven days.', rows: [] },
    { title: 'Later', note: 'Scheduled further out.', rows: [] },
  ]
  for (const s of schedules) {
    const d = daysUntil(s.nextDueAt)
    if (d < 0) buckets[0].rows.push(s)
    else if (d <= 7) buckets[1].rows.push(s)
    else buckets[2].rows.push(s)
  }

  return (
    <AppShell
      nav={physicianNav(pending, flagged)}
      active="/physician/calendar"
      role={session.role}
      userName={me!.fullName}
      roleLabel="Physician"
      notifications={unread}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Calendar</h2>
          <div className="ml-sub">
            Care here is asynchronous, so this is the check-in schedule rather than an appointment
            book.
          </div>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
        {buckets.map((b) => (
          <section key={b.title} className="ml-card self-start">
            <div className="ml-card-title flex items-center justify-between">
              <span className={b.title === 'Overdue' && b.rows.length ? 'ml-danger' : ''}>{b.title}</span>
              <span className="ml-sub text-[12px]">{b.rows.length}</span>
            </div>
            <div className="p-5">
              <div className="ml-sub mb-3 text-[11px]">{b.note}</div>
              {b.rows.length === 0 ? (
                <div className="ml-sub">Nothing here.</div>
              ) : (
                b.rows.map((s) => {
                  const d = daysUntil(s.nextDueAt)
                  return (
                    <div key={s.id} className="ml-file">
                      <div className="min-w-0">
                        <div className="truncate text-[14px]">{s.patient.fullName}</div>
                        <div className="ml-sub text-[11px]">
                          {s.questionnaire.title} ·{' '}
                          {d < 0 ? `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue` : d === 0 ? 'due today' : `in ${d} days`}
                        </div>
                      </div>
                      {s.patient.submissions[0] ? (
                        <Link href={`/physician/patients/${s.patient.submissions[0].id}`} className="ml-btn-review no-underline">
                          Open
                        </Link>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  )
}
