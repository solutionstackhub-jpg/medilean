/** Dev helper: print the physician queue exactly as the database sees it. */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: ['DATABASE_URL','POSTGRES_URL','STORAGE_URL','POSTGRES_PRISMA_URL','DATABASE_POSTGRES_URL','NEON_DATABASE_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL_NON_POOLING'].map((n) => process.env[n]).find((v) => v?.startsWith('postgres')) }) })
const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n)

async function main() {
  const subs = await prisma.submission.findMany({
    include: { patient: { include: { patientProfile: true } }, flags: { include: { rule: true } } },
    orderBy: { submittedAt: 'desc' },
  })
  console.log(pad('PATIENT', 18), pad('ST', 4), pad('STATUS', 12), 'FLAGS')
  for (const s of subs) {
    const flags = s.flags.map((x) => x.severity[0] + ':' + x.rule.key).join(', ') || '—'
    console.log(
      pad(s.patient.fullName, 18),
      pad(s.patient.patientProfile?.stateCode ?? '?', 4),
      pad(s.status, 12),
      flags,
    )
  }
  await prisma.$disconnect()
}
main()
