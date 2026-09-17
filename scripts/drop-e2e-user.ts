/** Dev helper: remove the end-to-end test patient so the flow can be re-run. */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
async function main() {
  const r = await prisma.user.deleteMany({ where: { email: 'e2e.patient@example.com' } })
  console.log('removed', r.count)
  await prisma.$disconnect()
}
main()
