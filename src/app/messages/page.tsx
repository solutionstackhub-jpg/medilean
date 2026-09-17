import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { tryDecrypt } from '@/lib/crypto'
import { markThreadRead } from '@/actions/messages'
import { recentlyActive } from '@/lib/clinical'
import AppShell, { PATIENT_NAV } from '@/components/AppShell'
import MessageThread from '@/components/MessageThread'

export default async function PatientMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>
}) {
  const session = await requireVerifiedPatient()
  const params = await searchParams

  const me = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } })
  const physician = await prisma.user.findFirst({
    where: { role: 'PHYSICIAN' },
    select: { lastLoginAt: true },
  })

  const threads = await prisma.thread.findMany({
    where: { patientId: session.userId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: { where: { senderId: { not: session.userId }, readAt: null } } } },
    },
  })

  const activeId = params.thread ?? threads[0]?.id ?? null

  const messages = activeId
    ? await prisma.message.findMany({
        where: { threadId: activeId, thread: { patientId: session.userId } },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { fullName: true, role: true } } },
      })
    : []

  if (activeId) {
    await markThreadRead(activeId)
    await audit({
      actorId: session.userId,
      actorRole: session.role,
      action: 'thread.view',
      entity: 'Thread',
      entityId: activeId,
      patientId: session.userId,
    })
  }

  return (
    <AppShell
      nav={PATIENT_NAV}
      active="/messages"
      role={session.role}
      userName={me.fullName}
      roleLabel="Patient"
      notifications={threads.reduce((n, t) => n + t._count.messages, 0)}
      notificationsHref="/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Messages</h2>
          <div className="ml-sub">A private thread with your care team.</div>
        </>
      }
    >
      <MessageThread
        basePath="/messages"
        title="Your care team"
        emptyHint="Your thread opens once your intake is with a clinician."
        searchable={false}
        activeId={activeId}
        threads={threads.map((t) => ({
          id: t.id,
          name: 'Care team',
          preview: tryDecrypt(t.messages[0]?.bodyEnc, 'No messages yet'),
          at: t.lastMessageAt,
          unread: t._count.messages,
          active: recentlyActive(physician?.lastLoginAt),
        }))}
        messages={messages.map((m) => ({
          id: m.id,
          body: tryDecrypt(m.bodyEnc, '[unreadable]'),
          mine: m.senderId === session.userId,
          at: m.createdAt,
          senderName: m.sender.role === 'PHYSICIAN' ? m.sender.fullName : 'You',
        }))}
      />
    </AppShell>
  )
}
