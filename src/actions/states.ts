'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireRole } from '@/lib/auth'

/**
 * Licensed states.
 *
 * Which states the practice can accept patients from is configuration, because
 * a new licence should not need a deployment. Turning one off does not touch
 * patients already under care — it only closes the door to new sign-ups.
 */
export async function toggleState(formData: FormData): Promise<void> {
  const session = await requireRole('ADMIN')
  const code = String(formData.get('code') ?? '')

  const state = await prisma.eligibleState.findUnique({ where: { code } })
  if (!state) return

  await prisma.eligibleState.update({
    where: { code },
    data: {
      active: !state.active,
      note: state.active ? 'Physician not currently licensed in this state.' : null,
    },
  })

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'eligible_state.toggle',
    entity: 'EligibleState',
    entityId: code,
    meta: { state: state.name, active: !state.active },
  })

  revalidatePath('/admin/states')
}
