import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { tryDecrypt } from '@/lib/crypto'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import { unreadForPatient } from '@/lib/physician'
import UploadPanel from './UploadPanel'
import { removeDocument, toggleShare } from '@/actions/documents'

const KIND_LABEL: Record<string, string> = {
  LAB_RESULT: 'Lab result',
  ID_DOCUMENT: 'Identification',
  PROGRESS_PHOTO: 'Progress photo',
  OTHER: 'Other',
}

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default async function DocumentsPage() {
  const session = await requireVerifiedPatient()

  const [me, documents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    prisma.document.findMany({
      where: { patientId: session.userId },
      orderBy: { uploadedAt: 'desc' },
    }),
  ])

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'documents.view',
    entity: 'Document',
    patientId: session.userId,
    meta: { count: documents.length },
  })

  return (
    <AppShell
      nav={PATIENT_NAV}
      active="/documents"
      role={session.role}
      userName={me.fullName}
      roleLabel="Patient"
      notifications={await unreadForPatient(session.userId)}
      notificationsHref="/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Documents</h2>
          <div className="ml-sub">Lab results, identification and progress photographs.</div>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_1.1fr] gap-3 max-[900px]:grid-cols-1">
        <UploadPanel />

        <section className="ml-card">
          <div className="ml-card-title">Recent Uploads ({documents.length})</div>
          <div className="p-5">
            {documents.length === 0 ? (
              <div className="ml-sub">Nothing uploaded yet.</div>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="ml-file">
                  <div className="min-w-0">
                    <div className="truncate text-[14px]">{tryDecrypt(d.filenameEnc, 'file')}</div>
                    <div className="ml-sub text-[11px]">
                      {KIND_LABEL[d.kind]} · {size(d.sizeBytes)} ·{' '}
                      {d.uploadedAt.toLocaleDateString()}
                      {d.kind === 'PROGRESS_PHOTO'
                        ? d.sharedWithCareTeam
                          ? ' · shared with care team'
                          : ' · private to you'
                        : ''}
                    </div>
                  </div>

                  <div className="flex flex-none items-center gap-2">
                    <Link href={`/api/documents/${d.id}`} className="ml-btn-review no-underline" target="_blank">
                      View
                    </Link>
                    {d.kind === 'PROGRESS_PHOTO' ? (
                      <form action={toggleShare}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="ml-btn-review" type="submit">
                          {d.sharedWithCareTeam ? 'Make private' : 'Share'}
                        </button>
                      </form>
                    ) : null}
                    <form action={removeDocument}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="ml-btn-review" type="submit">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <p className="ml-sub mt-5 text-[11px]">
        Files are encrypted before they are written to storage, and are only ever served through a
        signed-in request that is written to the access log. Nothing has a public link.
      </p>
    </AppShell>
  )
}
