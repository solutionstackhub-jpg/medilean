import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { physicianChrome } from '@/lib/physician'
import { loadQueue, relativeDay } from '@/lib/queue'
import AppShell, { physicianNav } from '@/components/AppShell'

export default async function PhysicianOverview() {
  const session = await requireRole('PHYSICIAN')
  const { me, pending, flagged, unread } = await physicianChrome()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 864e5)

  const [queue, reviewedThisWeek, activePlans, dueSoon, recentNotes] = await Promise.all([
    loadQueue('pending'),
    prisma.submission.count({ where: { reviewedAt: { gte: weekAgo } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.followUpSchedule.count({
      where: { active: true, nextDueAt: { lte: new Date(now.getTime() + 7 * 864e5) } },
    }),
    prisma.clinicalNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { physician: { select: { fullName: true } }, submission: { select: { id: true } } },
    }),
  ])

  const patients = await prisma.user.findMany({
    where: { id: { in: [...new Set(recentNotes.map((n) => n.patientId))] } },
    select: { id: true, fullName: true },
  })
  const nameOf = new Map(patients.map((p) => [p.id, p.fullName]))

  await audit({ actorId: session.userId, actorRole: session.role, action: 'physician.dashboard', entity: 'User' })

  const oldest = queue.at(0)

  return (
    <AppShell
      nav={physicianNav(pending, flagged)}
      active="/physician/overview"
      role={session.role}
      userName={me!.fullName}
      roleLabel="Physician"
      notifications={unread}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Dashboard</h2>
          <div className="ml-sub">Where the practice stands this morning.</div>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-2 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {[
          { label: 'Waiting for review', value: pending, tone: pending > 0 ? 'ml-green' : '', note: oldest ? `oldest ${relativeDay(oldest.submittedAt).toLowerCase()}` : 'nothing waiting' },
          { label: 'Open flags', value: flagged, tone: flagged > 0 ? 'ml-danger' : '', note: 'cases needing a second look' },
          { label: 'Reviewed this week', value: reviewedThisWeek, tone: '', note: 'decisions recorded' },
          { label: 'Active plans', value: activePlans, tone: '', note: `${dueSoon} check-ins due in 7 days` },
        ].map((k) => (
          <div key={k.label} className="ml-kpi">
            <small>{k.label}</small>
            <strong className={k.tone}>{k.value}</strong>
            <small>{k.note}</small>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[1.3fr_1fr] gap-3 max-[900px]:grid-cols-1">
        <section className="ml-card">
          <div className="ml-card-title flex items-center justify-between">
            <span>Next in the queue</span>
            <Link href="/physician" className="ml-btn-review no-underline">Open queue</Link>
          </div>
          <div className="p-5">
            {queue.length === 0 ? (
              <div className="ml-sub py-6 text-center">Nothing is waiting. Good morning.</div>
            ) : (
              queue.slice(0, 6).map((r) => (
                <div key={r.submissionId} className="ml-file">
                  <div>
                    <div className="text-[14px]">{r.name}</div>
                    <div className="ml-sub text-[11px]">
                      {r.statusLabel} · {relativeDay(r.submittedAt)}
                      {r.flagCount ? ` · ${r.flagCount} flag${r.flagCount === 1 ? '' : 's'}` : ''}
                    </div>
                  </div>
                  <Link href={`/physician/patients/${r.submissionId}`} className="ml-btn-review no-underline">
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="ml-card">
          <div className="ml-card-title">Latest clinical notes</div>
          <div className="p-5">
            {recentNotes.length === 0 ? (
              <div className="ml-sub">No notes yet.</div>
            ) : (
              recentNotes.map((n) => (
                <div key={n.id} className="ml-file">
                  <div className="min-w-0">
                    <div className="truncate text-[14px]">{nameOf.get(n.patientId) ?? 'Patient'}</div>
                    <div className="ml-sub text-[11px]">
                      {n.physician.fullName} · {n.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  {n.submission ? (
                    <Link href={`/physician/patients/${n.submission.id}`} className="ml-btn-review no-underline">
                      Open
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
