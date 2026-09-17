import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { physicianChrome } from '@/lib/physician'
import AppShell, { physicianNav } from '@/components/AppShell'

const money = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`

export default async function PracticeBillingPage() {
  const session = await requireRole('PHYSICIAN')
  const { me, pending, flagged, unread } = await physicianChrome()

  const [subs, invoices, paidAgg, openAgg] = await Promise.all([
    prisma.subscription.groupBy({ by: ['status'], _count: true, _sum: { priceCents: true } }),
    prisma.invoice.findMany({
      orderBy: { issuedAt: 'desc' },
      take: 20,
      include: { patient: { select: { fullName: true } } },
    }),
    prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amountCents: true }, _count: true }),
    prisma.invoice.aggregate({ where: { status: 'OPEN' }, _sum: { amountCents: true }, _count: true }),
  ])

  await audit({ actorId: session.userId, actorRole: session.role, action: 'practice_billing.view', entity: 'Subscription' })

  const active = subs.find((s) => s.status === 'ACTIVE')
  const mrr = active?._sum.priceCents ?? 0

  return (
    <AppShell
      nav={physicianNav(pending, flagged)}
      active="/physician/billing"
      role={session.role}
      userName={me!.fullName}
      roleLabel="Physician"
      notifications={unread}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Billing</h2>
          <div className="ml-sub">
            Money only. Nothing clinical appears on an invoice, which is what keeps Stripe outside
            the PHI boundary.
          </div>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-2 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {[
          ['Monthly recurring', money(mrr), `${active?._count ?? 0} active plans`],
          ['Collected', money(paidAgg._sum.amountCents ?? 0), `${paidAgg._count} invoices paid`],
          ['Outstanding', money(openAgg._sum.amountCents ?? 0), `${openAgg._count} open`],
          ['Cancelled', String(subs.find((s) => s.status === 'CANCELED')?._count ?? 0), 'plans ended'],
        ].map(([label, value, note]) => (
          <div key={label} className="ml-kpi">
            <small>{label}</small>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>

      <section className="ml-card mt-3">
        <div className="ml-card-title">Recent invoices</div>
        <div className="overflow-x-auto p-5">
          {invoices.length === 0 ? (
            <div className="ml-sub py-6 text-center">No invoices raised yet.</div>
          ) : (
            <table className="ml-table">
              <thead>
                <tr>
                  <th>Invoice</th><th>Patient</th><th>Period</th><th>Amount</th><th>Status</th><th>Issued</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-[12px]">{inv.number}</td>
                    <td>{inv.patient.fullName}</td>
                    <td className="ml-sub">
                      {inv.periodStart.toLocaleDateString()} – {inv.periodEnd.toLocaleDateString()}
                    </td>
                    <td>{money(inv.amountCents)}</td>
                    <td>
                      <span className={`ml-pill ${inv.status === 'PAID' ? '' : inv.status === 'OPEN' ? 'is-yellow' : 'is-grey'}`}>
                        {inv.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="ml-sub">{inv.issuedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  )
}
