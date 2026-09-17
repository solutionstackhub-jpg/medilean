import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { tryDecrypt } from '@/lib/crypto'
import BillingShell from '@/components/BillingShell'

export default async function BillingSettingsPage() {
  const session = await requireVerifiedPatient()

  const [me, sub] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      include: { patientProfile: true },
    }),
    prisma.subscription.findUnique({ where: { patientId: session.userId } }),
  ])

  const rows: Array<[string, string]> = [
    ['Billed to', me.fullName],
    ['Receipts sent to', me.email],
    ['Billing state', me.patientProfile?.stateCode ?? '—'],
    ['Card on file', sub?.cardLast4 ? `•••• ${sub.cardLast4}` : 'None'],
    ['Stripe customer', sub?.stripeCustomerId ?? 'Not linked (simulation mode)'],
  ]

  return (
    <BillingShell
      userId={session.userId}
      role={session.role}
      active="/billing/settings"
      title="Billing Settings"
      subtitle="Where receipts go and what is on file."
    >
      <div className="max-w-[560px]">
        {rows.map(([k, v]) => (
          <div key={k} className="ml-file">
            <span className="ml-sub">{k}</span>
            <span>{v}</span>
          </div>
        ))}

        <p className="ml-sub mt-6">
          Receipts go to your account email and contain a plan name and an amount — never a
          medication or anything about your care. To change your email or phone number, open{' '}
          <Link href="/profile" className="ml-green">My Profile</Link>.
        </p>

        <p className="ml-sub mt-3 text-[11px]">
          {tryDecrypt(me.phoneEnc) ? 'A mobile number is on file for account alerts only.' : ''}
        </p>
      </div>
    </BillingShell>
  )
}
