import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
async function main() {
  const status = process.argv[3] === 'active' ? 'ACTIVE' : 'SUSPENDED'
  await prisma.user.update({ where: { email: process.argv[2] }, data: { status } })
  console.log(process.argv[2], '->', status)
  await prisma.$disconnect()
}
main()
