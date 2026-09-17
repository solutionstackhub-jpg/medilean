import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { tryDecrypt, decryptJson } from '@/lib/crypto'
import { bmi } from '@/lib/clinical'
import { queueCounts } from '@/lib/queue'
import { visibleQuestions, type Answers, type Condition } from '@/lib/rules'
import AppShell, { physicianNav } from '@/components/AppShell'
import { unreadForPhysician } from '@/lib/physician'
import DecisionPanel from './DecisionPanel'
import { resolveFlag } from '@/actions/review'

function age(dobEnc?: string | null): number | null {
  const dob = tryDecrypt(dobEnc)
  if (!dob) return null
  const then = new Date(dob)
  if (Number.isNaN(then.getTime())) return null
  const now = new Date()
  let a = now.getFullYear() - then.getFullYear()
  const m = now.getMonth() - then.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < then.getDate())) a--
  return a
}

function renderAnswer(value: unknown, options: Array<{ value: string; label: string }> | null): string {
  const labelFor = (v: unknown) => options?.find((o) => o.value === String(v))?.label ?? String(v)
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.map(labelFor).join(', ') : '—'
  return labelFor(value)
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('PHYSICIAN')
  const { id } = await params

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      patient: { include: { patientProfile: true, subscription: true } },
      questionnaire: { include: { questions: { orderBy: { order: 'asc' } } } },
      answers: true,
      flags: { include: { rule: true }, orderBy: { raisedAt: 'asc' } },
      notes: { include: { physician: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!submission) notFound()

  const [counts, me, documents, weights, priorSubmissions] = await Promise.all([
    queueCounts(),
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    prisma.document.findMany({
      where: { patientId: submission.patientId, sharedWithCareTeam: true },
      orderBy: { uploadedAt: 'desc' },
    }),
    prisma.weightEntry.findMany({
      where: { patientId: submission.patientId },
      orderBy: { recordedAt: 'desc' },
      take: 6,
    }),
    prisma.submission.count({
      where: { patientId: submission.patientId, id: { not: submission.id }, status: { not: 'DRAFT' } },
    }),
  ])

  // Opening a chart is the event that matters most in an investigation.
  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'submission.view',
    entity: 'Submission',
    entityId: submission.id,
    patientId: submission.patientId,
    meta: { openFlags: submission.flags.filter((f) => !f.resolvedAt).length },
  })

  const answers: Answers = {}
  for (const a of submission.answers) {
    try {
      answers[a.questionKey] = decryptJson(a.valueEnc)
    } catch {
      answers[a.questionKey] = '[unreadable]'
    }
  }

  const profile = submission.patient.patientProfile
  const height = Number(answers['height_in']) || profile?.heightInches || null
  const weight = Number(answers['weight_lb']) || weights[0]?.weightLb || null
  const currentBmi = bmi(height, weight)

  // Show only what the patient was actually asked, in the order they saw it.
  const asked = visibleQuestions(
    submission.questionnaire.questions.map((q) => ({ ...q, showIf: q.showIf as Condition | null })),
    answers,
  )

  const openFlags = submission.flags.filter((f) => !f.resolvedAt)
  const resolvedFlags = submission.flags.filter((f) => f.resolvedAt)

  const severityTone = { HIGH: 'is-red', MEDIUM: 'is-yellow', LOW: '' } as const

  return (
    <AppShell
      nav={physicianNav(counts.pending, counts.flagged)}
      active="/physician"
      role={session.role}
      userName={me.fullName}
      roleLabel="Physician"
      notifications={await unreadForPhysician(session.userId)}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <Link href="/physician" className="ml-sub no-underline hover:text-white">
            ← Back to queue
          </Link>
          <h2 className="mt-1 text-[22px] font-bold">{submission.patient.fullName}</h2>
          <div className="ml-sub">
            {submission.questionnaire.title} · submitted{' '}
            {submission.submittedAt?.toLocaleDateString() ?? 'not yet'}
          </div>
        </>
      }
    >
      {/* ------------------------------------------------------------ flags */}
      {openFlags.length > 0 ? (
        <section className="mb-4 rounded-lg border border-[#5a2b2e] bg-[#1c1215] p-5">
          <div className="mb-3 flex items-center gap-2 text-[15px] font-bold">
            <span className="ml-danger">⚠</span> {openFlags.length} clinical flag
            {openFlags.length > 1 ? 's' : ''} raised
          </div>
          <div className="ml-sub mb-4 text-[12px]">
            Raised by the rules configured in Clinical Flags. They route this case to you; they do
            not decide anything.
          </div>

          <div className="flex flex-col gap-2.5">
            {openFlags.map((flag) => (
              <div key={flag.id} className="ml-panel flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className={`ml-pill ${severityTone[flag.severity]}`}>{flag.severity}</span>
                    <strong className="text-[14px]">{flag.rule.label}</strong>
                  </div>
                  {flag.rule.guidance ? (
                    <div className="ml-sub mt-2">{flag.rule.guidance}</div>
                  ) : null}
                </div>
                <form action={resolveFlag}>
                  <input type="hidden" name="flagId" value={flag.id} />
                  <button className="ml-btn-review" type="submit">
                    Acknowledge
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-[1.35fr_1fr] gap-3 max-[900px]:grid-cols-1">
        {/* ------------------------------------------------------- left column */}
        <div className="flex flex-col gap-3">
          <section className="ml-card">
            <div className="ml-card-title">Patient Summary</div>
            <div className="grid grid-cols-4 gap-4 p-5 max-[560px]:grid-cols-2">
              {[
                ['Age', age(profile?.dobEnc)?.toString() ?? '—'],
                ['Sex', profile?.sex ? profile.sex.charAt(0) + profile.sex.slice(1).toLowerCase() : '—'],
                ['State', profile?.stateCode ?? '—'],
                ['BMI', currentBmi?.toString() ?? '—'],
                ['Current weight', weight ? `${weight} lbs` : '—'],
                ['Starting weight', profile?.startingWeightLb ? `${profile.startingWeightLb} lbs` : '—'],
                ['Goal', profile?.goalWeightLb ? `${profile.goalWeightLb} lbs` : '—'],
                ['Prior submissions', String(priorSubmissions)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="ml-sub text-[11px]">{label}</div>
                  <div className="mt-1 text-[15px]">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="ml-card">
            <div className="ml-card-title">Intake Answers</div>
            <div className="p-5">
              {asked.map((q) => (
                <div key={q.key} className="border-b border-line py-3 last:border-0">
                  <div className="ml-sub text-[12px]">{q.label}</div>
                  <div className="mt-1 text-[14px]">
                    {renderAnswer(answers[q.key], q.options as Array<{ value: string; label: string }> | null)}
                  </div>
                </div>
              ))}
              <div className="ml-sub mt-3 text-[11px]">
                Questions the patient never saw, because the branching rules hid them, are not shown.
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------ right column */}
        <div className="flex flex-col gap-3">
          <DecisionPanel submissionId={submission.id} currentStatus={submission.status} />

          <section className="ml-card">
            <div className="ml-card-title">Recent Weights</div>
            <div className="p-5">
              {weights.length === 0 ? (
                <div className="ml-sub">No readings yet.</div>
              ) : (
                weights.map((w) => (
                  <div key={w.id} className="ml-file">
                    <span>{w.weightLb} lbs</span>
                    <span className="ml-sub">{w.recordedAt.toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="ml-card">
            <div className="ml-card-title">Documents</div>
            <div className="p-5">
              {documents.length === 0 ? (
                <div className="ml-sub">Nothing shared with the care team.</div>
              ) : (
                documents.map((d) => (
                  <div key={d.id} className="ml-file">
                    <span className="truncate">{tryDecrypt(d.filenameEnc, 'file')}</span>
                    <Link href={`/api/documents/${d.id}`} className="ml-btn-review no-underline">
                      View
                    </Link>
                  </div>
                ))
              )}
              <div className="ml-sub mt-3 text-[11px]">
                Progress photographs stay private to the patient unless they share them.
              </div>
            </div>
          </section>

          <section className="ml-card">
            <div className="ml-card-title">Clinical Notes</div>
            <div className="p-5">
              {submission.notes.length === 0 ? (
                <div className="ml-sub">No notes on this case yet.</div>
              ) : (
                submission.notes.map((n) => (
                  <div key={n.id} className="border-b border-line py-3 last:border-0">
                    <div className="ml-sub text-[11px]">
                      {n.physician.fullName} · {n.createdAt.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-[14px] leading-relaxed">
                      {tryDecrypt(n.bodyEnc, '[unreadable]')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {resolvedFlags.length > 0 ? (
            <section className="ml-card">
              <div className="ml-card-title">Acknowledged Flags</div>
              <div className="p-5">
                {resolvedFlags.map((f) => (
                  <div key={f.id} className="ml-file">
                    <span className="ml-sub">{f.rule.label}</span>
                    <span className="ml-sub text-[11px]">{f.resolvedAt?.toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <p className="ml-sub mt-5 text-[11px]">
        This chart view has been recorded in the access log, with your name and the time.
      </p>
    </AppShell>
  )
}
