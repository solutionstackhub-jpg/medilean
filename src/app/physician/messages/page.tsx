import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { tryDecrypt } from '@/lib/crypto'
import { physicianChrome } from '@/lib/physician'
import { markThreadRead } from '@/actions/messages'
import { recentlyActive } from '@/lib/clinical'
import AppShell, { physicianNav } from '@/components/AppShell'
import MessageThread from '@/components/MessageThread'

export default async function PhysicianMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; q?: string }>
}) {
  const session = await requireRole('PHYSICIAN')
  const params = await searchParams

  const search = params.q?.trim() || undefined
  const { me, pending, flagged, unread } = await physicianChrome()

  const threads = await prisma.thread.findMany({
      where: search
        ? { patient: { fullName: { contains: search, mode: 'insensitive' } } }
        : {},
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patient: { select: { fullName: true, lastLoginAt: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { senderId: { not: session.userId }, readAt: null } } } },
      },
  })

  const activeId = params.thread ?? threads[0]?.id ?? null

  const messages = activeId
    ? await prisma.message.findMany({
        where: { threadId: activeId },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { fullName: true, role: true } } },
      })
    : []

  if (activeId) {
    const thread = threads.find((t) => t.id === activeId)
    await markThreadRead(activeId)
    await audit({
      actorId: session.userId,
      actorRole: session.role,
      action: 'thread.view',
      entity: 'Thread',
      entityId: activeId,
      patientId: thread?.patientId ?? null,
    })
  }

  return (
    <AppShell
      nav={physicianNav(pending, flagged)}
      active="/physician/messages"
      role={session.role}
      userName={me!.fullName}
      roleLabel="Physician"
      notifications={unread}
      notificationsHref="/physician/messages"
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Secure Messaging</h2>
          <div className="ml-sub">Every thread you open is written to the access log.</div>
        </>
      }
    >
      <MessageThread
        basePath="/physician/messages"
        title="Conversations"
        emptyHint="No patient threads yet."
        search={search}
        activeId={activeId}
        threads={threads.map((t) => ({
          id: t.id,
          name: t.patient.fullName,
          preview: tryDecrypt(t.messages[0]?.bodyEnc, 'No messages yet'),
          at: t.lastMessageAt,
          unread: t._count.messages,
          active: recentlyActive(t.patient.lastLoginAt),
        }))}
        messages={messages.map((m) => ({
          id: m.id,
          body: tryDecrypt(m.bodyEnc, '[unreadable]'),
          mine: m.senderId === session.userId,
          at: m.createdAt,
          senderName: m.sender.fullName,
        }))}
      />
    </AppShell>
  )
}
