import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { physicianChrome } from '@/lib/physician'
import AppShell, { physicianNav } from '@/components/AppShell'

export default async function ReportsPage() {
  const session = await requireRole('PHYSICIAN')
  const { me, pending, flagged, unread } = await physicianChrome()

  const [byStatus, byRule, byState, totals, outcomes] = await Promise.all([
    prisma.submission.groupBy({ by: ['status'], _count: true }),
    prisma.raisedFlag.groupBy({ by: ['ruleId'], _count: true, orderBy: { _count: { ruleId: 'desc' } } }),
    prisma.patientProfile.groupBy({ by: ['stateCode'], _count: true }),
    prisma.$transaction([
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.submission.count(),
      prisma.clinicalNote.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]),
    prisma.submission.groupBy({ by: ['status'], where: { reviewedAt: { not: null } }, _count: true }),
  ])

  const rules = await prisma.flagRule.findMany({
    where: { id: { in: byRule.map((r) => r.ruleId) } },
    select: { id: true, label: true, severity: true },
  })
  const ruleName = new Map(rules.map((r) => [r.id, r]))

  await audit({ actorId: session.userId, actorRole: session.role, action: 'reports.view', entity: 'Submission' })

  const [patients, submissions, notes, active] = totals
  const reviewed = outcomes.reduce((n, o) => n + o._count, 0)
  const approved = outcomes.find((o) => o.status === 'APPROVED')?._count ?? 0

  const bar = (n: number, max: number) => `${max ? Math.round((n / max) * 100) : 0}%`
  const maxRule = Math.max(1, ...byRule.map((r) => r._count))
  const maxState = Math.max(1, ...byState.map((r) => r._count))

  return (
    <AppShell
      nav={physicianNav(pending, flagged)}
      active="/physician/reports"
      role={session.role}
      userName={me!.fullName}
      roleLabel="Physician"
      notifications={unread}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Reports</h2>
          <div className="ml-sub">
            Counts only. No report here contains a name or anything clinical about an individual.
          </div>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-2 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {[
          ['Patients', patients, 'on the books'],
          ['Submissions', submissions, 'intakes and check-ins'],
          ['Reviewed', reviewed, `${approved} approved`],
          ['Active plans', active, 'currently billing'],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="ml-kpi">
            <small>{label}</small>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
        <section className="ml-card">
          <div className="ml-card-title">Cases by status</div>
          <div className="p-5">
            {byStatus.map((s) => (
              <div key={s.status} className="ml-file">
                <span className="ml-sub capitalize">{s.status.replace('_', ' ').toLowerCase()}</span>
                <span>{s._count}</span>
              </div>
            ))}
            {byStatus.length === 0 ? <div className="ml-sub">Nothing yet.</div> : null}
          </div>
        </section>

        <section className="ml-card">
          <div className="ml-card-title">Which flags fire most</div>
          <div className="p-5">
            {byRule.length === 0 ? (
              <div className="ml-sub">No flags raised yet.</div>
            ) : (
              byRule.map((r) => {
                const rule = ruleName.get(r.ruleId)
                return (
                  <div key={r.ruleId} className="py-2.5">
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span className="truncate pr-3">{rule?.label ?? 'Rule'}</span>
                      <span className="ml-sub">{r._count}</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-sm bg-[#18313b]">
                      <div
                        className={`h-full rounded-sm ${rule?.severity === 'HIGH' ? 'bg-[#ff625c]' : rule?.severity === 'MEDIUM' ? 'bg-[#e3b655]' : 'bg-[#58edb5]'}`}
                        style={{ width: bar(r._count, maxRule) }}
                      />
                    </div>
                  </div>
                )
              })
            )}
            <div className="ml-sub mt-3 text-[11px]">
              A rule that fires on almost everything is usually a rule worth re-tuning.
            </div>
          </div>
        </section>

        <section className="ml-card">
          <div className="ml-card-title">Patients by state</div>
          <div className="p-5">
            {byState.length === 0 ? (
              <div className="ml-sub">Nothing yet.</div>
            ) : (
              byState
                .filter((s) => s.stateCode)
                .sort((a, b) => b._count - a._count)
                .map((s) => (
                  <div key={s.stateCode} className="py-2.5">
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span>{s.stateCode}</span>
                      <span className="ml-sub">{s._count}</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-sm bg-[#18313b]">
                      <div className="h-full rounded-sm bg-[#28c994]" style={{ width: bar(s._count, maxState) }} />
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      <p className="ml-sub mt-5 text-[11px]">{notes} clinical notes recorded across all cases.</p>
    </AppShell>
  )
}
