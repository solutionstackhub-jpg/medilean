import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { tryDecrypt } from '@/lib/crypto'
import { queueCounts } from '@/lib/queue'
import AppShell, { physicianNav } from '@/components/AppShell'
import { unreadForPhysician } from '@/lib/physician'

export default async function NotesPage() {
  const session = await requireRole('PHYSICIAN')

  const [me, counts, notes] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    queueCounts(),
    prisma.clinicalNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { physician: { select: { fullName: true } }, submission: { select: { id: true } } },
    }),
  ])

  const patients = await prisma.user.findMany({
    where: { id: { in: [...new Set(notes.map((n) => n.patientId))] } },
    select: { id: true, fullName: true },
  })
  const nameOf = new Map(patients.map((p) => [p.id, p.fullName]))

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'notes.list',
    entity: 'ClinicalNote',
    meta: { count: notes.length },
  })

  return (
    <AppShell
      nav={physicianNav(counts.pending, counts.flagged)}
      active="/physician/notes"
      role={session.role}
      userName={me.fullName}
      roleLabel="Physician"
      notifications={await unreadForPhysician(session.userId)}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Clinical Notes</h2>
          <div className="ml-sub">Every note is encrypted and attributed to whoever wrote it.</div>
        </>
      }
    >
      <section className="ml-card p-5">
        {notes.length === 0 ? (
          <div className="ml-sub py-8 text-center">No notes recorded yet.</div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="border-b border-line py-4 last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <strong className="text-[14px]">{nameOf.get(n.patientId) ?? 'Patient'}</strong>
                <span className="ml-sub text-[11px]">
                  {n.physician.fullName} · {n.createdAt.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 text-[14px] leading-relaxed">
                {tryDecrypt(n.bodyEnc, '[unreadable]')}
              </div>
              {n.submission ? (
                <Link
                  href={`/physician/patients/${n.submission.id}`}
                  className="ml-sub mt-2 inline-block text-[12px] underline"
                >
                  Open the case
                </Link>
              ) : null}
            </div>
          ))
        )}
      </section>
    </AppShell>
  )
}
