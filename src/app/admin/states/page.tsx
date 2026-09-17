import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import AppShell, { ADMIN_NAV } from '@/components/AppShell'
import { toggleState } from '@/actions/states'

export default async function StatesPage() {
  const session = await requireRole('ADMIN')

  const [me, states, patientCounts] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    prisma.eligibleState.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.patientProfile.groupBy({ by: ['stateCode'], _count: true }),
  ])

  const countOf = new Map(patientCounts.map((c) => [c.stateCode, c._count]))
  const activeCount = states.filter((s) => s.active).length

  return (
    <AppShell
      nav={ADMIN_NAV}
      active="/admin/states"
      role={session.role}
      userName={me.fullName}
      roleLabel="Administrator"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Licensed States</h2>
          <div className="ml-sub">
            Accepting new patients in {activeCount} of {states.length} states. Turning one off does
            not affect patients already under care.
          </div>
        </>
      }
    >
      <section className="ml-card p-5">
        <div className="grid grid-cols-3 gap-2 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {states.map((s) => {
            const patients = countOf.get(s.code) ?? 0
            return (
              <div
                key={s.code}
                className={`ml-panel flex items-center justify-between gap-3 p-3.5 ${s.active ? '' : 'opacity-60'}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px]">
                    {s.name} <span className="ml-sub">{s.code}</span>
                  </div>
                  <div className="ml-sub text-[11px]">
                    {s.active ? 'Accepting patients' : 'Closed'}
                    {patients ? ` · ${patients} on file` : ''}
                  </div>
                </div>
                <form action={toggleState}>
                  <input type="hidden" name="code" value={s.code} />
                  <button className="ml-btn-review" type="submit">
                    {s.active ? 'Close' : 'Open'}
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      </section>
    </AppShell>
  )
}
