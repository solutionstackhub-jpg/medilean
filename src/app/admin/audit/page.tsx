import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import AppShell, { ADMIN_NAV } from '@/components/AppShell'
import AuditTable from '@/components/AuditTable'

export default async function AdminAuditPage() {
  const session = await requireRole('ADMIN')
  const me = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } })

  const [total, denials] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { action: { contains: 'denied' } } }),
  ])

  return (
    <AppShell
      nav={ADMIN_NAV}
      active="/admin/audit"
      role={session.role}
      userName={me.fullName}
      roleLabel="Administrator"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Audit Log</h2>
          <div className="ml-sub">
            {total.toLocaleString()} events recorded
            {denials ? `, including ${denials} refused access attempt${denials === 1 ? '' : 's'}` : ''}.
          </div>
        </>
      }
    >
      <section className="ml-card p-5">
        <AuditTable limit={200} />
        <div className="ml-sub mt-4 text-[11px]">
          In production the application&apos;s database role has INSERT on this table but not UPDATE
          or DELETE, so an audit trail cannot be quietly tidied up. See docs/SECURITY.md.
        </div>
      </section>
    </AppShell>
  )
}
