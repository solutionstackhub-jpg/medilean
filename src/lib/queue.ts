import { prisma } from '@/lib/db'
import { tryDecrypt } from '@/lib/crypto'
import { bmi } from '@/lib/clinical'
import type { SubmissionStatus } from '@/generated/prisma/enums'

export type QueueTab = 'pending' | 'followups' | 'flagged'

export type QueueRow = {
  submissionId: string
  patientId: string
  name: string
  age: number | null
  bmi: number | null
  status: SubmissionStatus
  statusLabel: string
  statusTone: 'green' | 'yellow' | 'red' | 'grey'
  flagCount: number
  highFlags: number
  submittedAt: Date | null
  type: 'INTAKE' | 'FOLLOW_UP'
}

const STATUS_PRESENTATION: Record<SubmissionStatus, { label: string; tone: QueueRow['statusTone'] }> = {
  DRAFT: { label: 'Draft', tone: 'grey' },
  SUBMITTED: { label: 'New Intake', tone: 'green' },
  IN_REVIEW: { label: 'In Review', tone: 'yellow' },
  NEEDS_INFO: { label: 'Needs Info', tone: 'red' },
  APPROVED: { label: 'Approved', tone: 'green' },
  DECLINED: { label: 'Declined', tone: 'red' },
}

function ageFrom(dobEnc: string | null | undefined): number | null {
  const dob = tryDecrypt(dobEnc)
  if (!dob) return null
  const then = new Date(dob)
  if (Number.isNaN(then.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - then.getFullYear()
  const m = now.getMonth() - then.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < then.getDate())) age--
  return age
}

export async function queueCounts() {
  const [pending, followups, flagged] = await Promise.all([
    prisma.submission.count({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO'] }, questionnaire: { type: 'INTAKE' } },
    }),
    prisma.submission.count({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] }, questionnaire: { type: 'FOLLOW_UP' } },
    }),
    prisma.submission.count({ where: { flags: { some: { resolvedAt: null } } } }),
  ])
  return { pending, followups, flagged }
}

export async function loadQueue(tab: QueueTab, search?: string): Promise<QueueRow[]> {
  const where =
    tab === 'flagged'
      ? { flags: { some: { resolvedAt: null } } }
      : tab === 'followups'
        ? { status: { in: ['SUBMITTED', 'IN_REVIEW'] as SubmissionStatus[] }, questionnaire: { type: 'FOLLOW_UP' as const } }
        : {
            status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO'] as SubmissionStatus[] },
            questionnaire: { type: 'INTAKE' as const },
          }

  const rows = await prisma.submission.findMany({
    where: {
      ...where,
      // Name search only. Searching encrypted clinical answers would mean
      // decrypting the whole table on every keystroke.
      ...(search
        ? { patient: { OR: [{ fullName: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] } }
        : {}),
    },
    include: {
      patient: { include: { patientProfile: true } },
      questionnaire: { select: { type: true } },
      flags: { where: { resolvedAt: null }, select: { severity: true } },
      answers: { where: { questionKey: { in: ['height_in', 'weight_lb'] } } },
    },
    orderBy: [{ submittedAt: 'asc' }],
  })

  return rows.map((row) => {
    const answers = Object.fromEntries(
      row.answers.map((a) => {
        const raw = tryDecrypt(a.valueEnc, 'null')
        return [a.questionKey, Number(JSON.parse(raw))]
      }),
    )
    const height = answers['height_in'] || row.patient.patientProfile?.heightInches || null
    const presentation = STATUS_PRESENTATION[row.status]

    return {
      submissionId: row.id,
      patientId: row.patientId,
      name: row.patient.fullName,
      age: ageFrom(row.patient.patientProfile?.dobEnc),
      bmi: bmi(height, answers['weight_lb']),
      status: row.status,
      statusLabel: row.flags.length && row.status === 'SUBMITTED' ? 'Flagged' : presentation.label,
      statusTone: row.flags.length && row.status === 'SUBMITTED' ? 'red' : presentation.tone,
      flagCount: row.flags.length,
      highFlags: row.flags.filter((f) => f.severity === 'HIGH').length,
      submittedAt: row.submittedAt,
      type: row.questionnaire.type,
    }
  })
}

export function relativeDay(date: Date | null): string {
  if (!date) return '—'
  const days = Math.floor((Date.now() - date.getTime()) / 864e5)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return date.toLocaleDateString()
}
