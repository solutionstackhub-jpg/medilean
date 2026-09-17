import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
async function main() {
  const r = await prisma.user.deleteMany({ where: { email: process.argv[2] } })
  console.log('removed', r.count, process.argv[2]); await prisma.$disconnect()
}
main()
