/** Dev helper: print a session cookie for a seeded account, for smoke tests. */
import 'dotenv/config'
import { SignJWT } from 'jose'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

async function main() {
  const email = process.argv[2]
  if (!email) throw new Error('usage: tsx scripts/mint-session.ts <email>')
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET!))
  console.log(token)
  await prisma.$disconnect()
}
main()
