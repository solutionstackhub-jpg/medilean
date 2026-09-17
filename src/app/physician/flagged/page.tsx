import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { loadQueue, queueCounts, relativeDay } from '@/lib/queue'
import AppShell, { physicianNav } from '@/components/AppShell'
import { unreadForPhysician } from '@/lib/physician'

export default async function FlaggedPage() {
  const session = await requireRole('PHYSICIAN')
  const [me, counts, rows] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    queueCounts(),
    loadQueue('flagged'),
  ])

  return (
    <AppShell
      nav={physicianNav(counts.pending, counts.flagged)}
      active="/physician/flagged"
      role={session.role}
      userName={me.fullName}
      roleLabel="Physician"
      notifications={await unreadForPhysician(session.userId)}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Flagged Cases</h2>
          <div className="ml-sub">
            Raised by the rules in Clinical Flags. Sorted with the highest severity first.
          </div>
        </>
      }
    >
      <section className="ml-card p-5">
        {rows.length === 0 ? (
          <div className="ml-sub py-8 text-center">Nothing flagged right now.</div>
        ) : (
          [...rows]
            .sort((a, b) => b.highFlags - a.highFlags || b.flagCount - a.flagCount)
            .map((r) => (
              <div key={r.submissionId} className="ml-file">
                <div>
                  <div className="text-[14px]">{r.name}</div>
                  <div className="ml-sub text-[11px]">
                    {r.flagCount} open flag{r.flagCount === 1 ? '' : 's'}
                    {r.highFlags ? `, ${r.highFlags} high severity` : ''} ·{' '}
                    {relativeDay(r.submittedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={r.highFlags ? 'ml-danger' : 'text-[#f1c565]'}>
                    {'●'.repeat(Math.min(r.flagCount, 4))}
                  </span>
                  <Link href={`/physician/patients/${r.submissionId}`} className="ml-btn-review no-underline">
                    Review
                  </Link>
                </div>
              </div>
            ))
        )}
      </section>
    </AppShell>
  )
}
