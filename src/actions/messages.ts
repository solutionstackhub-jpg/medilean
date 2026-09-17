'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireSession, assertPatientAccess } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'

/**
 * Secure messaging.
 *
 * Message bodies are encrypted and never leave the platform. When someone needs
 * to be told there is a reply, a Notification row is written with a template key
 * and nothing else — the email or text says only that something is waiting.
 */
export async function sendMessage(formData: FormData): Promise<void> {
  const session = await requireSession()
  const threadId = String(formData.get('threadId') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!body) return

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, patientId: true },
  })
  if (!thread) return

  await assertPatientAccess(session, thread.patientId)

  await prisma.$transaction([
    prisma.message.create({
      data: { threadId: thread.id, senderId: session.userId, bodyEnc: encrypt(body) },
    }),
    prisma.thread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } }),
  ])

  // Tell the other side something arrived, with no clinical content in it.
  const recipientId =
    session.role === 'PATIENT'
      ? (await prisma.user.findFirst({ where: { role: 'PHYSICIAN' }, select: { id: true } }))?.id
      : thread.patientId

  if (recipientId && recipientId !== session.userId) {
    await prisma.notification.create({
      data: { userId: recipientId, channel: 'EMAIL', templateKey: 'new_message', deliveredAt: new Date() },
    })
  }

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'message.send',
    entity: 'Thread',
    entityId: thread.id,
    patientId: thread.patientId,
    meta: { length: body.length },
  })

  revalidatePath(session.role === 'PATIENT' ? '/messages' : `/physician/messages`)
}

export async function markThreadRead(threadId: string): Promise<void> {
  const session = await requireSession()
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { patientId: true },
  })
  if (!thread) return
  await assertPatientAccess(session, thread.patientId)

  await prisma.message.updateMany({
    where: { threadId, senderId: { not: session.userId }, readAt: null },
    data: { readAt: new Date() },
  })
}
