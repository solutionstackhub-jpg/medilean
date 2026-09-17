import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { queueCounts } from '@/lib/queue'
import AppShell, { physicianNav } from '@/components/AppShell'
import { unreadForPhysician } from '@/lib/physician'

export default async function PatientsPage() {
  const session = await requireRole('PHYSICIAN')

  const [me, counts, patients] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    queueCounts(),
    prisma.user.findMany({
      where: { role: 'PATIENT' },
      orderBy: { fullName: 'asc' },
      include: {
        patientProfile: true,
        subscription: true,
        submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  ])

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'patients.list',
    entity: 'User',
    meta: { count: patients.length },
  })

  return (
    <AppShell
      nav={physicianNav(counts.pending, counts.flagged)}
      active="/physician/patients"
      role={session.role}
      userName={me.fullName}
      roleLabel="Physician"
      notifications={await unreadForPhysician(session.userId)}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Patients</h2>
          <div className="ml-sub">Everyone under the practice&apos;s care.</div>
        </>
      }
    >
      <section className="ml-card p-5">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>State</th>
              <th>Plan</th>
              <th>Latest case</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td>{p.fullName}</td>
                <td className="ml-sub">{p.patientProfile?.stateCode ?? '—'}</td>
                <td>
                  <span className={`ml-pill ${p.subscription?.status === 'ACTIVE' ? '' : 'is-grey'}`}>
                    {p.subscription?.status.toLowerCase() ?? 'none'}
                  </span>
                </td>
                <td className="ml-sub">
                  {p.submissions[0]?.status.replace('_', ' ').toLowerCase() ?? 'nothing yet'}
                </td>
                <td className="text-right">
                  {p.submissions[0] ? (
                    <Link href={`/physician/patients/${p.submissions[0].id}`} className="ml-btn-review no-underline">
                      Open
                    </Link>
                  ) : (
                    <span className="ml-sub">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  )
}
