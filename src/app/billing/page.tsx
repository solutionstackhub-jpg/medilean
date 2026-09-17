import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { isSimulated } from '@/lib/stripe'
import { tryDecrypt } from '@/lib/crypto'
import BillingShell from '@/components/BillingShell'
import { Banner } from '@/components/ui'
import BillingActions from './BillingActions'

export default async function BillingOverviewPage() {
  const session = await requireVerifiedPatient()

  const [sub, plan, lastInvoice] = await Promise.all([
    prisma.subscription.findUnique({ where: { patientId: session.userId } }),
    prisma.treatmentPlan.findUnique({ where: { patientId: session.userId } }),
    prisma.invoice.findFirst({ where: { patientId: session.userId }, orderBy: { issuedAt: 'desc' } }),
  ])

  await audit({
    actorId: session.userId, actorRole: session.role, action: 'billing.view',
    entity: 'Subscription', entityId: sub?.id ?? null, patientId: session.userId,
  })

  const active = sub?.status === 'ACTIVE' || sub?.status === 'TRIALING'
  const price = ((sub?.priceCents ?? 29900) / 100).toFixed(0)

  return (
    <BillingShell
      userId={session.userId}
      role={session.role}
      active="/billing"
      title="Subscription &amp; Billing"
      subtitle="Your plan, your payment method, and your invoices."
    >
      {isSimulated() ? (
        <div className="mb-4">
          <Banner tone="warn">
            Stripe keys are not configured, so billing runs in local simulation. The screens and the
            data model are real; only the call to Stripe is skipped.
          </Banner>
        </div>
      ) : null}

      <div className="ml-panel flex flex-wrap items-center justify-between gap-5 p-5">
        <div>
          <span className={active ? 'ml-green' : 'ml-sub'}>
            {active ? 'Active Plan' : sub?.status === 'CANCELED' ? 'Cancelled' : 'No plan yet'}
          </span>
          <div className="mt-1 text-[15px] font-bold">{sub?.planName ?? 'Weight Management Program'}</div>
          <div className="mt-1 text-[22px] font-extrabold">${price} / month</div>
          {plan?.medicationEnc ? (
            <div className="ml-sub mt-2 text-[12px]">
              {tryDecrypt(plan.medicationEnc)} · {tryDecrypt(plan.scheduleEnc)}
            </div>
          ) : null}
        </div>

        <div className="ml-sub">
          {active && sub?.currentPeriodEnd ? (
            <>
              Next billing date
              <br />
              <b className="text-ink">{sub.currentPeriodEnd.toLocaleDateString()}</b>
            </>
          ) : (
            <>
              Billing starts once a
              <br />
              physician approves your plan.
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/billing/subscription" className="ml-btn no-underline">Manage Plan</Link>
          <BillingActions active={active} />
        </div>
      </div>

      <h3 className="mb-3 mt-7 text-[15px] font-bold">Payment Methods</h3>
      {sub?.cardLast4 ? (
        <div className="ml-panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            💳 &nbsp; •••• {sub.cardLast4}
            <div className="ml-sub mt-1 text-[12px]">
              {sub.cardBrand?.toUpperCase()} · Expires {sub.cardExpMonth}/{sub.cardExpYear}
            </div>
          </div>
          <span className="ml-pill">Default</span>
          <Link href="/billing/methods" className="ml-btn no-underline">Edit</Link>
        </div>
      ) : (
        <div className="ml-sub">
          No card on file. One is added through Stripe&apos;s hosted checkout when your plan starts.
        </div>
      )}

      {lastInvoice ? (
        <p className="ml-sub mt-6 text-[12px]">
          Last invoice {lastInvoice.number} for ${(lastInvoice.amountCents / 100).toFixed(2)},{' '}
          {lastInvoice.status.toLowerCase()}.{' '}
          <Link href="/billing/invoices" className="ml-green">See all invoices →</Link>
        </p>
      ) : null}

      <p className="ml-sub mt-4 text-[11px]">
        Card numbers never reach MediLean. We store a Stripe reference and the last four digits
        Stripe reports back, and nothing about your health is ever sent to Stripe.
      </p>
    </BillingShell>
  )
}
