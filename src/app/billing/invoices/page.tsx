import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import BillingShell from '@/components/BillingShell'

export default async function InvoicesPage() {
  const session = await requireVerifiedPatient()

  const invoices = await prisma.invoice.findMany({
    where: { patientId: session.userId },
    orderBy: { issuedAt: 'desc' },
  })

  await audit({
    actorId: session.userId, actorRole: session.role, action: 'invoices.view',
    entity: 'Invoice', patientId: session.userId, meta: { count: invoices.length },
  })

  return (
    <BillingShell
      userId={session.userId}
      role={session.role}
      active="/billing/invoices"
      title="Invoices"
      subtitle="Every charge, with what period it covered."
    >
      {invoices.length === 0 ? (
        <div className="ml-sub py-8 text-center">
          No invoices yet. The first one is raised when your plan starts.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="ml-table">
            <thead>
              <tr>
                <th>Invoice</th><th>Description</th><th>Period</th><th>Amount</th><th>Status</th><th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono text-[12px]">{inv.number}</td>
                  <td>{inv.description}</td>
                  <td className="ml-sub">
                    {inv.periodStart.toLocaleDateString()} – {inv.periodEnd.toLocaleDateString()}
                  </td>
                  <td>${(inv.amountCents / 100).toFixed(2)}</td>
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
        </div>
      )}

      <p className="ml-sub mt-5 text-[11px]">
        An invoice shows a plan name and an amount. It never shows a medication, a diagnosis or
        anything else about your care.
      </p>
    </BillingShell>
  )
}
