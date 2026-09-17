import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import type { Role } from '@/generated/prisma/enums'

/**
 * Audit logging.
 *
 * Two things make this useful rather than decorative:
 *
 *  1. It records reads, not only writes. After an incident the question is
 *     always who *looked* at a chart.
 *  2. `patientId` is denormalised onto every row, so "everyone who touched this
 *     patient" is one index scan instead of a join across five tables.
 *
 * In production the application's database role should have INSERT but not
 * UPDATE or DELETE on this table. See docs/DEPLOYMENT.md.
 */

export type AuditInput = {
  actorId?: string | null
  actorRole?: Role | null
  action: string
  entity: string
  entityId?: string | null
  patientId?: string | null
  meta?: Record<string, unknown>
}

export async function audit(input: AuditInput): Promise<void> {
  let ip: string | null = null
  let userAgent: string | null = null

  try {
    const h = await headers()
    ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    userAgent = h.get('user-agent')
  } catch {
    // Called outside a request (a seed script, a cron job). Not a reason to skip the log.
  }

  // A deleted actor would violate the foreign key. The event still matters, so
  // it is written without the link rather than dropped.
  let actorId = input.actorId ?? null
  if (actorId) {
    const exists = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } })
    if (!exists) actorId = null
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        patientId: input.patientId ?? null,
        ip,
        userAgent,
        meta: (input.meta ?? {}) as never,
      },
    })
  } catch (err) {
    // An audit write must never take down the request that triggered it, but it
    // must be loud. In production this goes to the alerting channel.
    console.error('[audit] failed to write audit record', input.action, err)
  }
}
