import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { bmi, daysUntil } from '@/lib/clinical'
import { tryDecrypt } from '@/lib/crypto'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import ProgressChart from '@/components/ProgressChart'
import { Banner } from '@/components/ui'
import { UserIcon, ClipboardIcon, TrendIcon, MailIcon } from '@/components/icons'

function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const session = await requireVerifiedPatient()

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { patientProfile: true, subscription: true, treatmentPlan: true },
  })

  const [weights, followUp, latestSubmission, unread, photos] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { patientId: session.userId },
      orderBy: { recordedAt: 'asc' },
      select: { weightLb: true, recordedAt: true },
    }),
    prisma.followUpSchedule.findFirst({
      where: { patientId: session.userId, active: true },
      orderBy: { nextDueAt: 'asc' },
      include: { questionnaire: true },
    }),
    prisma.submission.findFirst({
      where: { patientId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { questionnaire: true },
    }),
    prisma.message.count({
      where: {
        thread: { patientId: session.userId },
        senderId: { not: session.userId },
        readAt: null,
      },
    }),
    prisma.document.findMany({
      where: { patientId: session.userId, kind: 'PROGRESS_PHOTO' },
      orderBy: { uploadedAt: 'asc' },
      select: { id: true, uploadedAt: true, sharedWithCareTeam: true },
    }),
  ])

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'dashboard.view',
    entity: 'User',
    entityId: session.userId,
    patientId: session.userId,
  })

  const profile = user.patientProfile
  const current = weights.at(-1)?.weightLb ?? null
  const start = profile?.startingWeightLb ?? weights.at(0)?.weightLb ?? null
  const lost = current !== null && start !== null ? Math.round((start - current) * 10) / 10 : null
  const currentBmi = bmi(profile?.heightInches, current)

  const rawDueInDays = followUp ? daysUntil(followUp.nextDueAt) : null
  const followUpDue = rawDueInDays !== null && rawDueInDays <= 0
  const dueInDays = rawDueInDays === null ? null : Math.max(0, rawDueInDays)

  const plan = user.treatmentPlan
  const planActive = plan?.status === 'ACTIVE'
  const medication = tryDecrypt(plan?.medicationEnc)
  const schedule = tryDecrypt(plan?.scheduleEnc)
  const intakePending =
    latestSubmission && ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO'].includes(latestSubmission.status)

  const firstName = user.fullName.split(' ')[0]

  return (
    <AppShell
      nav={PATIENT_NAV}
      active="/dashboard"
      role={session.role}
      userName={user.fullName}
      roleLabel="Patient"
      notifications={unread}
      notificationsHref="/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">
            {greeting()}, {firstName}! 👋
          </h2>
          <div className="ml-sub">Stay consistent. You&apos;re making great progress.</div>
        </>
      }
    >
      {/* ------------------------------------------------ things needing action */}
      {latestSubmission?.status === 'NEEDS_INFO' ? (
        <div className="mb-4">
          <Banner tone="warn">
            Your care team needs a little more information before they can finish their review.{' '}
            <Link href="/intake" className="ml-green">
              Open your intake →
            </Link>
          </Banner>
        </div>
      ) : null}

      {followUpDue ? (
        <div className="mb-4">
          <Banner tone="warn">
            Your {followUp?.questionnaire.title.toLowerCase()} is due.{' '}
            <Link href="/questionnaires" className="ml-green">
              Start it now →
            </Link>
          </Banner>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- KPIs */}
      <div className="grid grid-cols-3 gap-2 max-[900px]:grid-cols-1">
        <div className="ml-kpi">
          <small>Current Weight</small>
          <strong>{current !== null ? `${current} lbs` : '—'}</strong>
          {lost !== null && lost !== 0 ? (
            <span className={`text-[13px] ${lost > 0 ? 'ml-green' : 'ml-danger'}`}>
              {lost > 0 ? '↓' : '↑'} {Math.abs(lost)} lbs since starting
            </span>
          ) : (
            <small>Your first reading is on file.</small>
          )}
        </div>

        <div className="ml-kpi">
          <small>Next Check-in</small>
          <strong>{dueInDays === null ? '—' : followUpDue ? 'Due now' : `${dueInDays} days`}</strong>
          <small>
            {followUp ? `Complete your ${followUp.questionnaire.title.toLowerCase()}` : 'Nothing scheduled yet'}
          </small>
        </div>

        <div className="ml-kpi">
          <small>Treatment Plan</small>
          <strong className={planActive ? 'ml-green' : ''}>
            {planActive ? 'Active' : intakePending ? 'In review' : 'Not started'}
          </strong>
          <small>
            {planActive ? (
              <>
                {medication || user.subscription?.planName}
                {schedule ? (
                  <>
                    <br />
                    {schedule}
                  </>
                ) : null}
              </>
            ) : intakePending ? (
              'A physician is reviewing your intake'
            ) : (
              'Complete your medical intake to begin'
            )}
          </small>
        </div>
      </div>

      {/* ----------------------------------------------------- quick actions */}
      <div className="my-3 grid grid-cols-4 gap-[7px] max-[560px]:grid-cols-2">
        {[
          { href: '/profile', Icon: UserIcon, label: 'My Profile', badge: 0 },
          { href: '/questionnaires', Icon: ClipboardIcon, label: 'Questionnaires', badge: 0 },
          { href: '/progress', Icon: TrendIcon, label: 'Progress', badge: 0 },
          { href: '/messages', Icon: MailIcon, label: 'Messages', badge: unread },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="ml-panel grid h-[88px] place-items-center text-center text-[13px] no-underline text-ink hover:border-[#2a5348]"
          >
            <div>
              <q.Icon className="ml-green mx-auto" size={22} />
              <div className="mt-2">
                {q.label}
                {q.badge ? <span className="ml-green"> ({q.badge})</span> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ---------------------------------------------------------- progress */}
      <section className="ml-card p-5">
        <h3 className="text-[15px] font-bold">Your Progress</h3>
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
        {currentBmi ? (
          <div className="ml-sub mt-3 text-[12px]">
            Current BMI {currentBmi}. BMI is one input among several and is not a diagnosis.
          </div>
        ) : null}
      </section>
    </AppShell>
  )
}
