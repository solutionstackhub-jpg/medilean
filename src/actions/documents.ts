'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireVerifiedPatient } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'
import { newStorageKey, putObject, deleteObject, ALLOWED_MIME, MAX_BYTES } from '@/lib/storage'
import type { DocumentKind } from '@/generated/prisma/enums'

export type UploadState = { error?: string; ok?: string }

export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const session = await requireVerifiedPatient()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload.' }

  if (file.size > MAX_BYTES) {
    return { error: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.` }
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: 'Only PDF, JPG, PNG and WebP files are accepted.' }
  }

  const kind = (String(formData.get('kind') ?? 'OTHER') as DocumentKind) ?? 'OTHER'
  // Progress photographs default to private: the patient decides whether the
  // care team sees them, which is what the brief asked for.
  const shared = kind === 'PROGRESS_PHOTO' ? formData.get('share') === 'on' : true

  const storageKey = newStorageKey()
  await putObject(storageKey, Buffer.from(await file.arrayBuffer()))

  const doc = await prisma.document.create({
    data: {
      patientId: session.userId,
      kind,
      // Filenames leak diagnoses more often than people expect.
      filenameEnc: encrypt(file.name),
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      sharedWithCareTeam: shared,
    },
  })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'document.upload',
    entity: 'Document',
    entityId: doc.id,
    patientId: session.userId,
    meta: { kind, bytes: file.size, mime: file.type, shared },
  })

  revalidatePath('/documents')
  return { ok: 'Uploaded.' }
}

export async function removeDocument(formData: FormData): Promise<void> {
  const session = await requireVerifiedPatient()
  const id = String(formData.get('id') ?? '')

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc || doc.patientId !== session.userId) return

  await deleteObject(doc.storageKey)
  await prisma.document.delete({ where: { id } })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'document.delete',
    entity: 'Document',
    entityId: id,
    patientId: session.userId,
  })

  revalidatePath('/documents')
}

export async function toggleShare(formData: FormData): Promise<void> {
  const session = await requireVerifiedPatient()
  const id = String(formData.get('id') ?? '')

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc || doc.patientId !== session.userId) return

  await prisma.document.update({
    where: { id },
    data: { sharedWithCareTeam: !doc.sharedWithCareTeam },
  })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'document.share_changed',
    entity: 'Document',
    entityId: id,
    patientId: session.userId,
    meta: { shared: !doc.sharedWithCareTeam },
  })

  revalidatePath('/documents')
}
