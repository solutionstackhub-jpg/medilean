/** Dev helper: show treatment plans and the decisions behind them. */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { tryDecrypt } from '../src/lib/crypto'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: ['DATABASE_URL','POSTGRES_URL','STORAGE_URL','POSTGRES_PRISMA_URL','DATABASE_POSTGRES_URL','NEON_DATABASE_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL_NON_POOLING'].map((n) => process.env[n]).find((v) => v?.startsWith('postgres')) }) })
const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n)

async function main() {
  const plans = await prisma.treatmentPlan.findMany({ include: { patient: { select: { fullName: true } } } })
  console.log('TREATMENT PLANS')
  for (const p of plans) {
    console.log(' ', pad(p.patient.fullName, 18), pad(p.status, 8),
      tryDecrypt(p.medicationEnc, '—'), '/', tryDecrypt(p.doseEnc, '—'), '/', tryDecrypt(p.scheduleEnc, '—'))
  }
  const subs = await prisma.submission.findMany({
    where: { status: { in: ['APPROVED', 'DECLINED'] } },
    include: { patient: { select: { fullName: true } }, notes: true },
  })
  console.log('\nDECIDED CASES')
  for (const s of subs) {
    console.log(' ', pad(s.patient.fullName, 18), pad(s.status, 10), `${s.notes.length} note(s)`)
  }
  const inv = await prisma.invoice.count()
  console.log(`\nINVOICES: ${inv}`)
  await prisma.$disconnect()
}
main()
