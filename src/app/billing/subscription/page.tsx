import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { tryDecrypt } from '@/lib/crypto'
import BillingShell from '@/components/BillingShell'
import { Banner } from '@/components/ui'
import PlanControls from './PlanControls'

export default async function SubscriptionPage() {
  const session = await requireVerifiedPatient()

  const [sub, plan, invoiceCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { patientId: session.userId } }),
    prisma.treatmentPlan.findUnique({ where: { patientId: session.userId } }),
    prisma.invoice.count({ where: { patientId: session.userId } }),
  ])

  await audit({
    actorId: session.userId, actorRole: session.role, action: 'subscription.view',
    entity: 'Subscription', entityId: sub?.id ?? null, patientId: session.userId,
  })

  const active = sub?.status === 'ACTIVE' || sub?.status === 'TRIALING'

  const rows: Array<[string, string]> = [
    ['Plan', sub?.planName ?? 'Weight Management Program'],
    ['Price', `$${((sub?.priceCents ?? 29900) / 100).toFixed(0)} per month`],
    ['Status', sub?.status.toLowerCase() ?? 'none'],
    ['Renews', active && sub?.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString() : '—'],
    ['Invoices raised', String(invoiceCount)],
  ]

  return (
    <BillingShell
      userId={session.userId}
      role={session.role}
      active="/billing/subscription"
      title="Manage Plan"
      subtitle="Change or end your subscription."
    >
      <div className="grid grid-cols-2 gap-6 max-[880px]:grid-cols-1">
        <div>
          <h3 className="mb-3 text-[15px] font-bold">Your subscription</h3>
          {rows.map(([k, v]) => (
            <div key={k} className="ml-file">
              <span className="ml-sub">{k}</span>
              <span className="capitalize">{v}</span>
            </div>
          ))}
          <div className="mt-6">
            <PlanControls status={sub?.status ?? 'NONE'} />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-[15px] font-bold">Your treatment plan</h3>
          {plan && plan.status === 'ACTIVE' ? (
            <>
              {([
                ['Medication', tryDecrypt(plan.medicationEnc, '—')],
                ['Dose', tryDecrypt(plan.doseEnc, '—')],
                ['Schedule', tryDecrypt(plan.scheduleEnc, '—')],
                ['Started', plan.startedAt?.toLocaleDateString() ?? '—'],
              ] as Array<[string, string]>).map(([k, v]) => (
                <div key={k} className="ml-file">
                  <span className="ml-sub">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div className="mt-4">
                <Banner>
                  Your treatment plan is set by your physician. Cancelling billing does not change
                  it — message your care team if you want to stop treatment.
                </Banner>
              </div>
            </>
          ) : (
            <div className="ml-sub">
              No treatment plan yet. A physician sets one after reviewing your intake.
            </div>
          )}
        </div>
      </div>
    </BillingShell>
  )
}
