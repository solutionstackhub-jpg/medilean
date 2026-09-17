import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { queueCounts } from '@/lib/queue'
import AppShell, { physicianNav } from '@/components/AppShell'
import { unreadForPhysician } from '@/lib/physician'
import AuditTable from '@/components/AuditTable'

export default async function PhysicianAuditPage() {
  const session = await requireRole('PHYSICIAN')
  const [me, counts] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    queueCounts(),
  ])

  return (
    <AppShell
      nav={physicianNav(counts.pending, counts.flagged)}
      active="/physician/audit"
      role={session.role}
      userName={me.fullName}
      roleLabel="Physician"
      notifications={await unreadForPhysician(session.userId)}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Access Log</h2>
          <div className="ml-sub">
            Reads as well as writes. Append-only: entries here cannot be edited or removed.
          </div>
        </>
      }
    >
      <section className="ml-card p-5">
        <AuditTable limit={150} />
      </section>
    </AppShell>
  )
}
