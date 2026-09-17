/** Dev helper: what does the demo data actually exercise? */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n)

async function main() {
  const rows: Array<[string, number]> = [
    ['patients', await prisma.user.count({ where: { role: 'PATIENT' } })],
    ['submissions (intake)', await prisma.submission.count({ where: { questionnaire: { type: 'INTAKE' } } })],
    ['submissions (follow-up)', await prisma.submission.count({ where: { questionnaire: { type: 'FOLLOW_UP' } } })],
    ['open flags', await prisma.raisedFlag.count({ where: { resolvedAt: null } })],
    ['resolved flags', await prisma.raisedFlag.count({ where: { resolvedAt: { not: null } } })],
    ['clinical notes', await prisma.clinicalNote.count()],
    ['treatment plans', await prisma.treatmentPlan.count()],
    ['invoices', await prisma.invoice.count()],
    ['documents', await prisma.document.count()],
    ['progress photos', await prisma.document.count({ where: { kind: 'PROGRESS_PHOTO' } })],
    ['weight entries', await prisma.weightEntry.count()],
    ['threads', await prisma.thread.count()],
    ['messages', await prisma.message.count()],
    ['unread messages', await prisma.message.count({ where: { readAt: null } })],
    ['follow-up schedules', await prisma.followUpSchedule.count()],
    ['audit events', await prisma.auditLog.count()],
    ['active subscriptions', await prisma.subscription.count({ where: { status: 'ACTIVE' } })],
    ['cancelled subscriptions', await prisma.subscription.count({ where: { status: 'CANCELED' } })],
  ]
  for (const [k, v] of rows) console.log(' ', pad(k, 26), String(v).padStart(4), v === 0 ? '  <-- empty' : '')
  await prisma.$disconnect()
}
main()
