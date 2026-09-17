import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { isSimulated } from '@/lib/stripe'
import BillingShell from '@/components/BillingShell'
import { Banner } from '@/components/ui'
import CardForm from './CardForm'

export default async function PaymentMethodsPage() {
  const session = await requireVerifiedPatient()
  const sub = await prisma.subscription.findUnique({ where: { patientId: session.userId } })

  await audit({
    actorId: session.userId, actorRole: session.role, action: 'payment_methods.view',
    entity: 'Subscription', entityId: sub?.id ?? null, patientId: session.userId,
  })

  return (
    <BillingShell
      userId={session.userId}
      role={session.role}
      active="/billing/methods"
      title="Payment Methods"
      subtitle="The card your subscription is billed to."
    >
      {sub?.cardLast4 ? (
        <div className="ml-panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            💳 &nbsp; •••• {sub.cardLast4}
            <div className="ml-sub mt-1 text-[12px]">
              {sub.cardBrand?.toUpperCase()} · Expires {sub.cardExpMonth}/{sub.cardExpYear}
            </div>
          </div>
          <span className="ml-pill">Default</span>
        </div>
      ) : (
        <div className="ml-sub">No card on file yet.</div>
      )}

      <h3 className="mb-3 mt-7 text-[15px] font-bold">
        {sub?.cardLast4 ? 'Replace this card' : 'Add a card'}
      </h3>

      {isSimulated() ? (
        <div className="mb-4 max-w-[520px]">
          <Banner tone="warn">
            Stripe is not configured, so this records the last four digits only. In production this
            button opens Stripe&apos;s billing portal and the full number is typed into Stripe,
            never into MediLean.
          </Banner>
        </div>
      ) : null}

      <CardForm simulated={isSimulated()} />

      <p className="ml-sub mt-5 text-[11px]">
        MediLean never stores a full card number, a CVC or an expiry we did not receive back from
        Stripe. That is what keeps our PCI scope small.
      </p>
    </BillingShell>
  )
}
