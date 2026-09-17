import { prisma } from '@/lib/db'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import BillingNav from '@/components/BillingNav'
import type { Role } from '@/generated/prisma/enums'

/** Billing pages share the outer app chrome plus the billing sub-rail. */
export default async function BillingShell({
  userId,
  role,
  active,
  title,
  subtitle,
  children,
}: {
  userId: string
  role: Role
  active: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const [me, unread] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.message.count({
      where: { thread: { patientId: userId }, senderId: { not: userId }, readAt: null },
    }),
  ])

  return (
    <AppShell
      nav={PATIENT_NAV}
      active="/billing"
      role={role}
      userName={me.fullName}
      roleLabel="Patient"
      notifications={unread}
      notificationsHref="/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">{title}</h2>
          <div className="ml-sub">{subtitle}</div>
        </>
      }
    >
      <section className="ml-card">
        <div className="grid grid-cols-[210px_1fr] max-[880px]:grid-cols-1">
          <div className="pl-5 max-[880px]:pl-4">
            <BillingNav active={active} />
          </div>
          <div className="p-6 max-[560px]:p-4">{children}</div>
        </div>
      </section>
    </AppShell>
  )
}
