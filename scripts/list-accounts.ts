/** Dev helper: print the demo accounts for a walkthrough. */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n)
async function main() {
  const users = await prisma.user.findMany({ orderBy: [{ role: 'asc' }, { fullName: 'asc' }], select: { email: true, role: true, fullName: true } })
  for (const u of users) console.log(' ', pad(u.role, 10), pad(u.fullName, 18), u.email)
  await prisma.$disconnect()
}
main()
