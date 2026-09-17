import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { tryDecrypt } from '@/lib/crypto'
import { physicianChrome } from '@/lib/physician'
import AppShell, { physicianNav } from '@/components/AppShell'
import { Banner } from '@/components/ui'

export default async function PhysicianSettingsPage() {
  const session = await requireRole('PHYSICIAN')
  const { me, pending, flagged, unread } = await physicianChrome()

  const [states, rules, questionnaires] = await Promise.all([
    prisma.eligibleState.count({ where: { active: true } }),
    prisma.flagRule.count({ where: { active: true } }),
    prisma.questionnaire.count({ where: { active: true } }),
  ])

  const rows: Array<[string, string]> = [
    ['Name', me!.fullName],
    ['Email', me!.email],
    ['Role', 'Physician'],
    ['Mobile', tryDecrypt(me!.phoneEnc, 'Not on file')],
    ['Last signed in', me!.lastLoginAt?.toLocaleString() ?? 'This session'],
    ['Account created', me!.createdAt.toLocaleDateString()],
  ]

  return (
    <AppShell
      nav={physicianNav(pending, flagged)}
      active="/physician/settings"
      role={session.role}
      userName={me!.fullName}
      roleLabel="Physician"
      notifications={unread}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Settings</h2>
          <div className="ml-sub">Your account, and what the practice is configured to do.</div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <section className="ml-card self-start">
          <div className="ml-card-title">Your account</div>
          <div className="p-5">
            {rows.map(([k, v]) => (
              <div key={k} className="ml-file">
                <span className="ml-sub">{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div className="mt-4">
              <Banner tone="warn">
                Multi-factor authentication is not enabled yet. An account that can read every chart
                needs it before real patients — see docs/SECURITY.md.
              </Banner>
            </div>
          </div>
        </section>

        <section className="ml-card self-start">
          <div className="ml-card-title">Clinical configuration</div>
          <div className="p-5">
            <p className="ml-sub mb-4">
              These are yours to change. MediLean applies them; it never decides what they should be.
            </p>
            {[
              { href: '/admin/flags', label: 'Clinical flag rules', value: `${rules} active` },
              { href: '/admin/states', label: 'Licensed states', value: `${states} open` },
              { href: '/admin/flags', label: 'Questionnaires', value: `${questionnaires} active` },
            ].map((r) => (
              <div key={r.label} className="ml-file">
                <div>
                  <div className="text-[14px]">{r.label}</div>
                  <div className="ml-sub text-[11px]">{r.value}</div>
                </div>
                <Link href={r.href} className="ml-btn-review no-underline">Open</Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
