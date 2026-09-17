/** Dev helper: put an account back to just after sign-up. */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
async function main() {
  const email = process.argv[2]
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { console.log('no such user'); return }

  await prisma.answer.deleteMany({ where: { submission: { patientId: user.id } } })
  await prisma.raisedFlag.deleteMany({ where: { submission: { patientId: user.id } } })
  await prisma.submission.deleteMany({ where: { patientId: user.id } })
  await prisma.weightEntry.deleteMany({ where: { patientId: user.id } })
  await prisma.verificationToken.deleteMany({ where: { userId: user.id } })
  await prisma.patientProfile.updateMany({
    where: { userId: user.id },
    data: { dobEnc: null, sex: null, stateCode: null, addressEnc: null,
            heightInches: null, startingWeightLb: null, goalWeightLb: null, programStartedAt: null },
  })
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: null, status: 'PENDING_VERIFICATION', phoneEnc: null, phoneVerifiedAt: null },
  })
  console.log(`${email} reset to just-signed-up`)
  await prisma.$disconnect()
}
main()
