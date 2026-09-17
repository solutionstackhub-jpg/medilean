import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

/** Shared chrome data for every physician screen: counts and the bell. */
export async function physicianChrome() {
  const session = await getSession()
  const [me, pending, flagged, unread] = await Promise.all([
    session ? prisma.user.findUniqueOrThrow({ where: { id: session.userId } }) : null,
    prisma.submission.count({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO'] }, questionnaire: { type: 'INTAKE' } },
    }),
    prisma.submission.count({ where: { flags: { some: { resolvedAt: null } } } }),
    session
      ? prisma.message.count({ where: { senderId: { not: session.userId }, readAt: null } })
      : 0,
  ])
  return { me, pending, flagged, unread }
}

/** Unread messages waiting for a clinician, for the toolbar bell. */
export async function unreadForPhysician(userId: string): Promise<number> {
  return prisma.message.count({ where: { senderId: { not: userId }, readAt: null } })
}

/** Unread messages waiting for one patient. */
export async function unreadForPatient(patientId: string): Promise<number> {
  return prisma.message.count({
    where: { thread: { patientId }, senderId: { not: patientId }, readAt: null },
  })
}
