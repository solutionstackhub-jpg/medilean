import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { tryDecrypt } from '@/lib/crypto'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import { unreadForPatient } from '@/lib/physician'
import AuditTable from '@/components/AuditTable'

export default async function ProfilePage() {
  const session = await requireVerifiedPatient()

  const me = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { patientProfile: true },
  })
  const state = me.patientProfile?.stateCode
    ? await prisma.eligibleState.findUnique({ where: { code: me.patientProfile.stateCode } })
    : null

  const rows: Array<[string, string]> = [
    ['Name', me.fullName],
    ['Email', me.email],
    ['Mobile', tryDecrypt(me.phoneEnc, 'Not on file')],
    ['Date of birth', tryDecrypt(me.patientProfile?.dobEnc, 'Not on file')],
    ['Sex assigned at birth', me.patientProfile?.sex?.toLowerCase() ?? '—'],
    ['State', state ? `${state.name}${state.active ? '' : ' (not served yet)'}` : '—'],
    ['Height', me.patientProfile?.heightInches ? `${me.patientProfile.heightInches} in` : '—'],
    ['Goal weight', me.patientProfile?.goalWeightLb ? `${me.patientProfile.goalWeightLb} lbs` : '—'],
  ]

  return (
    <AppShell
      nav={PATIENT_NAV}
      active="/profile"
      role={session.role}
      userName={me.fullName}
      roleLabel="Patient"
      notifications={await unreadForPatient(session.userId)}
      notificationsHref="/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">My Profile</h2>
          <div className="ml-sub">What we hold about you, and who has looked at it.</div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <section className="ml-card self-start">
          <div className="ml-card-title">Your Details</div>
          <div className="p-5">
            {rows.map(([label, value]) => (
              <div key={label} className="ml-file">
                <span className="ml-sub">{label}</span>
                <span className="capitalize">{value}</span>
              </div>
            ))}
            <div className="ml-sub mt-4 text-[11px]">
              Your date of birth, address and phone number are encrypted before they are stored.
            </div>
          </div>
        </section>

        <section className="ml-card">
          <div className="ml-card-title">Who Has Accessed Your Record</div>
          <div className="p-5">
            <AuditTable patientId={session.userId} limit={40} />
            <div className="ml-sub mt-4 text-[11px]">
              Every time a clinician opens your chart it appears here. You are entitled to see this.
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
