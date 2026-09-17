import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { apiSession, canAccessPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { tryDecrypt } from '@/lib/crypto'
import { getObject } from '@/lib/storage'

/**
 * Serves a stored file.
 *
 * Nothing is public. Every request is authorised, recorded, and sent with
 * headers that stop the browser or an intermediary caching clinical material.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await apiSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!canAccessPatient(session, doc.patientId)) {
    await audit({
      actorId: session.userId,
      actorRole: session.role,
      action: 'document.access_denied',
      entity: 'Document',
      entityId: id,
      patientId: doc.patientId,
    })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // A patient's private progress photograph is not the care team's to open.
  if (!doc.sharedWithCareTeam && session.userId !== doc.patientId) {
    await audit({
      actorId: session.userId,
      actorRole: session.role,
      action: 'document.access_denied_private',
      entity: 'Document',
      entityId: id,
      patientId: doc.patientId,
    })
    return NextResponse.json({ error: 'Not shared with the care team' }, { status: 403 })
  }

  const bytes = await getObject(doc.storageKey)
  if (!bytes) return NextResponse.json({ error: 'File is missing from storage' }, { status: 410 })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'document.download',
    entity: 'Document',
    entityId: id,
    patientId: doc.patientId,
  })

  const filename = tryDecrypt(doc.filenameEnc, 'document')
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Length': String(bytes.length),
      'Content-Disposition': `inline; filename="${filename.replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
