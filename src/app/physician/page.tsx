import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { loadQueue, queueCounts, relativeDay, type QueueTab } from '@/lib/queue'
import AppShell, { physicianNav } from '@/components/AppShell'
import { unreadForPhysician } from '@/lib/physician'

export default async function PhysicianQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>
}) {
  const session = await requireRole('PHYSICIAN')
  const params = await searchParams
  const tab = (['pending', 'followups', 'flagged'].includes(params.tab ?? '')
    ? params.tab
    : 'pending') as QueueTab
  const search = params.q?.trim() || undefined

  const [me, counts, rows] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    queueCounts(),
    loadQueue(tab, search),
  ])

  // Opening the queue is itself a disclosure of who is under care.
  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'queue.view',
    entity: 'Submission',
    meta: { tab, search: search ? 'yes' : 'no', results: rows.length },
  })

  const tabs: Array<[QueueTab, string, number]> = [
    ['pending', 'Pending Review', counts.pending],
    ['followups', 'Follow-ups', counts.followups],
    ['flagged', 'Flagged', counts.flagged],
  ]

  return (
    <AppShell
      nav={physicianNav(counts.pending, counts.flagged)}
      active="/physician"
      role={session.role}
      userName={me.fullName}
      roleLabel="Physician"
      notifications={await unreadForPhysician(session.userId)}
      notificationsHref="/physician/messages"
      toolbar={
        <form className="max-w-[460px]">
          <input
            name="q"
            defaultValue={search ?? ''}
            className="ml-input"
            placeholder="⌕  Search patients by name or email…"
          />
          <input type="hidden" name="tab" value={tab} />
        </form>
      }
    >
      <h2 className="text-[22px] font-bold">Patient Review Queue</h2>
      <div className="ml-sub">
        Cases waiting on a clinician. Nothing here has been decided automatically.
      </div>

      <div className="ml-tabs">
        {tabs.map(([key, label, count]) => (
          <Link
            key={key}
            href={`/physician?tab=${key}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            className={`ml-tab no-underline ${tab === key ? 'is-on' : ''} ${key === 'flagged' && count > 0 ? 'ml-danger' : ''}`}
          >
            {label} ({count})
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>BMI</th>
              <th>Status</th>
              <th>Flags</th>
              <th>Submitted</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="ml-sub py-10 text-center">
                  {search ? `Nothing matches “${search}”.` : 'Nothing waiting in this queue.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.submissionId}>
                  <td className="font-medium">{row.name}</td>
                  <td>{row.age ?? '—'}</td>
                  <td>{row.bmi ?? '—'}</td>
                  <td>
                    <span className={`ml-pill ${row.statusTone === 'red' ? 'is-red' : row.statusTone === 'yellow' ? 'is-yellow' : row.statusTone === 'grey' ? 'is-grey' : ''}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td>
                    {row.flagCount === 0 ? (
                      <span className="ml-sub">-</span>
                    ) : (
                      <span
                        className={row.highFlags ? 'ml-danger' : 'text-[#f1c565]'}
                        title={`${row.flagCount} open flag${row.flagCount > 1 ? 's' : ''}${row.highFlags ? `, ${row.highFlags} high` : ''}`}
                      >
                        {'●'.repeat(Math.min(row.flagCount, 4))}
                      </span>
                    )}
                  </td>
                  <td className="ml-sub">{relativeDay(row.submittedAt)}</td>
                  <td className="text-right">
                    <Link
                      href={`/physician/patients/${row.submissionId}`}
                      className="ml-btn-review no-underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
