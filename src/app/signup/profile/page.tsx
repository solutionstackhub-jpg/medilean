import { prisma } from '@/lib/db'
import { requireVerifiedPatient } from '@/lib/auth'
import OnboardShell from '@/components/OnboardShell'
import ProfileForm from './ProfileForm'

/**
 * Step 3 of onboarding.
 *
 * This is also where location eligibility is decided. The physician is licensed
 * in a specific set of states, and that list is a database row an admin toggles
 * — not a constant in the source. A patient outside the list is stopped here
 * rather than being allowed to complete an intake that could never be reviewed.
 */
export default async function ProfilePage() {
  await requireVerifiedPatient()

  const states = await prisma.eligibleState.findMany({
    orderBy: { name: 'asc' },
    select: { code: true, name: true, active: true },
  })

  return (
    <OnboardShell
      step={3}
      title="A Few Details About You"
      subtitle="We need these to confirm we can treat you and to keep your record accurate."
    >
      <ProfileForm states={states} />
    </OnboardShell>
  )
}
