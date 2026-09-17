import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: ['DATABASE_URL','POSTGRES_URL','STORAGE_URL','POSTGRES_PRISMA_URL','DATABASE_POSTGRES_URL','NEON_DATABASE_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL_NON_POOLING'].map((n) => process.env[n]).find((v) => v?.startsWith('postgres')) }) })
async function main() {
  const r = await prisma.user.deleteMany({ where: { email: process.argv[2] } })
  console.log('removed', r.count, process.argv[2]); await prisma.$disconnect()
}
main()
