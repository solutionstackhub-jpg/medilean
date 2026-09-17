import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: ['DATABASE_URL','POSTGRES_URL','STORAGE_URL','POSTGRES_PRISMA_URL','DATABASE_POSTGRES_URL','NEON_DATABASE_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL_NON_POOLING'].map((n) => process.env[n]).find((v) => v?.startsWith('postgres')) }) })
async function main() {
  const u = await prisma.user.findUnique({ where: { email: process.argv[2] } })
  if (!u) { console.log('no such user'); return }
  const t = await prisma.verificationToken.findFirst({
    where: { userId: u.id, kind: 'EMAIL', consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  console.log('  readable code:', t?.plainForDev ?? '(none)', ' expires:', t?.expiresAt.toISOString() ?? '-')
  await prisma.$disconnect()
}
main()
