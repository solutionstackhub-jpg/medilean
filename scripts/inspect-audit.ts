/** Dev helper: print one patient's access log, newest first. */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: ['DATABASE_URL','POSTGRES_URL','STORAGE_URL','POSTGRES_PRISMA_URL','DATABASE_POSTGRES_URL','NEON_DATABASE_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL_NON_POOLING'].map((n) => process.env[n]).find((v) => v?.startsWith('postgres')) }) })
const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n)
async function main() {
  const email = process.argv[2]
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('no such user')
  const rows = await prisma.auditLog.findMany({
    where: { patientId: user.id },
    orderBy: { createdAt: 'asc' },
    include: { actor: { select: { fullName: true } } },
  })
  for (const r of rows) {
    console.log(pad(r.createdAt.toISOString().slice(11, 19), 9), pad(r.actor?.fullName ?? '-', 18), pad(r.action, 30), JSON.stringify(r.meta))
  }
  console.log(rows.length, 'events')
  await prisma.$disconnect()
}
main()
