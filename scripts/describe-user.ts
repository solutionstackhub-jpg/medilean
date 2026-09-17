import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
async function main() {
  const u = await prisma.user.findUnique({
    where: { email: process.argv[2] },
    include: {
      patientProfile: true, subscription: true, treatmentPlan: true,
      submissions: { select: { id: true, status: true } },
      threadsAsPatient: { select: { id: true } },
      followUps: { select: { id: true } },
    },
  })
  if (!u) { console.log('no such user'); return }
  console.log('status          ', u.status)
  console.log('emailVerifiedAt ', u.emailVerifiedAt)
  console.log('role            ', u.role)
  console.log('patientProfile  ', u.patientProfile ? `yes (state=${u.patientProfile.stateCode})` : 'MISSING')
  console.log('subscription    ', u.subscription ? u.subscription.status : 'none')
  console.log('treatmentPlan   ', u.treatmentPlan ? u.treatmentPlan.status : 'none')
  console.log('submissions     ', u.submissions.length, u.submissions.map(s => s.status).join(','))
  console.log('threads         ', u.threadsAsPatient.length)
  console.log('followUps       ', u.followUps.length)
  await prisma.$disconnect()
}
main()
