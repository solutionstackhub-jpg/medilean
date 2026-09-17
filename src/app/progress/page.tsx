import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { bmi } from '@/lib/clinical'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import { unreadForPatient } from '@/lib/physician'
import ProgressChart from '@/components/ProgressChart'

export default async function ProgressPage() {
  const session = await requireVerifiedPatient()

  const [me, weights] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      include: { patientProfile: true },
    }),
    prisma.weightEntry.findMany({
      where: { patientId: session.userId },
      orderBy: { recordedAt: 'asc' },
    }),
  ])

  const photos = await prisma.document.findMany({
    where: { patientId: session.userId, kind: 'PROGRESS_PHOTO' },
    orderBy: { uploadedAt: 'asc' },
    select: { id: true, uploadedAt: true, sharedWithCareTeam: true },
  })

  const profile = me.patientProfile
  const latest = weights.at(-1)

  return (
    <AppShell
      nav={PATIENT_NAV}
      active="/progress"
      role={session.role}
      userName={me.fullName}
      roleLabel="Patient"
      notifications={await unreadForPatient(session.userId)}
      notificationsHref="/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Your Progress</h2>
          <div className="ml-sub">Every reading you or your care team has recorded.</div>
        </>
      }
    >
      <section className="ml-card mb-3 p-5">
        <ProgressChart
          points={weights.map((w) => ({ at: w.recordedAt.toISOString(), weightLb: w.weightLb }))}
          heightInches={profile?.heightInches}
          goalWeightLb={profile?.goalWeightLb}
          photos={photos.map((d) => ({
            id: d.id,
            at: d.uploadedAt.toISOString(),
            shared: d.sharedWithCareTeam,
          }))}
        />
      </section>

      <section className="ml-card">
        <div className="ml-card-title">Readings ({weights.length})</div>
        <div className="p-5">
          {weights.length === 0 ? (
            <div className="ml-sub">No readings yet. Your first check-in adds one.</div>
          ) : (
            [...weights].reverse().map((w) => (
              <div key={w.id} className="ml-file">
                <div>
                  <span className="text-[14px]">{w.weightLb} lbs</span>
                  {profile?.heightInches ? (
                    <span className="ml-sub ml-2 text-[12px]">
                      BMI {bmi(profile.heightInches, w.weightLb)}
                    </span>
                  ) : null}
                </div>
                <div className="ml-sub text-[12px]">
                  {w.recordedAt.toLocaleDateString()} · {w.source.replace('_', ' ')}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {latest ? (
        <p className="ml-sub mt-5 text-[11px]">
          Latest reading {latest.recordedAt.toLocaleDateString()}. BMI is one input among several
          and is not a diagnosis.
        </p>
      ) : null}
    </AppShell>
  )
}
