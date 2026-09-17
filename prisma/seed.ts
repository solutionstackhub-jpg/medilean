import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { encrypt, encryptJson } from '../src/lib/crypto'
import { evaluate, type Condition } from '../src/lib/rules'
import { newStorageKey, putObject } from '../src/lib/storage'
import { PATIENTS, EXTRA_MESSAGES } from './seed-data'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = 'Password123'
const FIXTURES = path.join(process.cwd(), 'prisma', 'fixtures')

const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 864e5)
const daysAhead = (n: number) => new Date(now.getTime() + n * 864e5)

const STATES: Array<[string, string, boolean]> = [
  ['AL', 'Alabama', false], ['AK', 'Alaska', false], ['AZ', 'Arizona', true],
  ['AR', 'Arkansas', false], ['CA', 'California', true], ['CO', 'Colorado', true],
  ['CT', 'Connecticut', false], ['DE', 'Delaware', false], ['FL', 'Florida', true],
  ['GA', 'Georgia', true], ['HI', 'Hawaii', false], ['ID', 'Idaho', false],
  ['IL', 'Illinois', true], ['IN', 'Indiana', false], ['IA', 'Iowa', false],
  ['KS', 'Kansas', false], ['KY', 'Kentucky', false], ['LA', 'Louisiana', false],
  ['ME', 'Maine', false], ['MD', 'Maryland', false], ['MA', 'Massachusetts', false],
  ['MI', 'Michigan', true], ['MN', 'Minnesota', false], ['MS', 'Mississippi', false],
  ['MO', 'Missouri', false], ['MT', 'Montana', false], ['NE', 'Nebraska', false],
  ['NV', 'Nevada', true], ['NH', 'New Hampshire', false], ['NJ', 'New Jersey', true],
  ['NM', 'New Mexico', false], ['NY', 'New York', true], ['NC', 'North Carolina', true],
  ['ND', 'North Dakota', false], ['OH', 'Ohio', true], ['OK', 'Oklahoma', false],
  ['OR', 'Oregon', false], ['PA', 'Pennsylvania', true], ['RI', 'Rhode Island', false],
  ['SC', 'South Carolina', false], ['SD', 'South Dakota', false], ['TN', 'Tennessee', false],
  ['TX', 'Texas', true], ['UT', 'Utah', false], ['VT', 'Vermont', false],
  ['VA', 'Virginia', true], ['WA', 'Washington', true], ['WV', 'West Virginia', false],
  ['WI', 'Wisconsin', false], ['WY', 'Wyoming', false],
]

const YES_NO = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]

const TRACK_STATUS = {
  new: 'SUBMITTED', in_review: 'IN_REVIEW', needs_info: 'NEEDS_INFO',
  active: 'APPROVED', cancelled: 'APPROVED', declined: 'DECLINED', draft: 'DRAFT',
} as const

async function wipe() {
  await prisma.auditLog.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.treatmentPlan.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.clinicalNote.deleteMany()
  await prisma.raisedFlag.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.followUpSchedule.deleteMany()
  await prisma.question.deleteMany()
  await prisma.questionnaire.deleteMany()
  await prisma.flagRule.deleteMany()
  await prisma.document.deleteMany()
  await prisma.weightEntry.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.patientProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.eligibleState.deleteMany()
}

async function seedQuestionnaires() {
  const intake = await prisma.questionnaire.create({
    data: {
      key: 'intake', version: 1, type: 'INTAKE',
      title: 'Tell Us About Your Health',
      subtitle: 'This information helps our physicians create a safe and personalized treatment plan.',
      questions: {
        create: [
          { key: 'height_in', order: 10, type: 'NUMBER', required: true, label: 'Your height', helpText: 'In inches. 5 ft 6 in is 66 inches.' },
          { key: 'weight_lb', order: 20, type: 'NUMBER', required: true, label: 'Your current weight', helpText: 'In pounds.' },
          { key: 'goal_weight_lb', order: 30, type: 'NUMBER', label: 'Your goal weight', helpText: 'In pounds. An estimate is fine.' },
          {
            key: 'conditions', order: 40, type: 'MULTI_CHOICE', required: true,
            label: 'Do you have any of the following conditions?', helpText: '(Select all that apply)',
            options: [
              { value: 'diabetes_t2', label: 'Type 2 Diabetes' },
              { value: 'high_bp', label: 'High Blood Pressure' },
              { value: 'heart_disease', label: 'Heart Disease' },
              { value: 'thyroid', label: 'Thyroid Disorder' },
              { value: 'sleep_apnea', label: 'Sleep Apnea' },
              { value: 'none', label: 'None of the above' },
            ],
          },
          { key: 'diabetes_meds', order: 50, type: 'TEXT', label: 'Which diabetes medications are you currently taking?', showIf: { question: 'conditions', op: 'includes', value: 'diabetes_t2' } },
          { key: 'bp_controlled', order: 60, type: 'SINGLE_CHOICE', label: 'Is your blood pressure currently controlled with medication?', options: YES_NO, showIf: { question: 'conditions', op: 'includes', value: 'high_bp' } },
          { key: 'heart_event_recent', order: 70, type: 'SINGLE_CHOICE', label: 'Have you had a heart attack or stroke in the last 12 months?', options: YES_NO, showIf: { question: 'conditions', op: 'includes', value: 'heart_disease' } },
          { key: 'thyroid_mtc_history', order: 80, type: 'SINGLE_CHOICE', label: 'Do you or a family member have a history of medullary thyroid carcinoma or MEN2?', options: YES_NO, showIf: { question: 'conditions', op: 'includes', value: 'thyroid' } },
          {
            key: 'pregnancy_status', order: 90, type: 'SINGLE_CHOICE', required: true,
            label: 'Are you pregnant, breastfeeding, or planning a pregnancy?',
            options: [
              { value: 'no', label: 'No' },
              { value: 'pregnant', label: 'Currently pregnant' },
              { value: 'breastfeeding', label: 'Breastfeeding' },
              { value: 'planning', label: 'Planning within 12 months' },
            ],
          },
          { key: 'prior_glp1', order: 100, type: 'SINGLE_CHOICE', required: true, label: 'Have you taken a GLP-1 medication before?', helpText: 'For example Ozempic, Wegovy, Mounjaro or Zepbound.', options: YES_NO },
          { key: 'prior_glp1_detail', order: 110, type: 'TEXT', label: 'Which one, and how did you respond to it?', showIf: { question: 'prior_glp1', op: 'eq', value: 'yes' } },
          { key: 'pancreatitis_history', order: 120, type: 'SINGLE_CHOICE', required: true, label: 'Have you ever been diagnosed with pancreatitis?', options: YES_NO },
          { key: 'eating_disorder_history', order: 130, type: 'SINGLE_CHOICE', required: true, label: 'Have you ever been treated for an eating disorder?', options: YES_NO },
          { key: 'alcohol_weekly', order: 140, type: 'NUMBER', label: 'On average, how many alcoholic drinks do you have per week?' },
          { key: 'current_meds', order: 150, type: 'TEXT', label: 'List any medications you take regularly', helpText: 'Include over-the-counter medicines and supplements.' },
          { key: 'allergies', order: 160, type: 'TEXT', label: 'Do you have any known drug allergies?' },
        ],
      },
    },
    include: { questions: true },
  })

  const followUp = await prisma.questionnaire.create({
    data: {
      key: 'follow_up_monthly', version: 1, type: 'FOLLOW_UP',
      title: 'Monthly Check-in',
      subtitle: 'A few questions so your care team can see how the plan is working.',
      questions: {
        create: [
          { key: 'weight_lb', order: 10, type: 'NUMBER', required: true, label: 'Your current weight', helpText: 'In pounds.' },
          { key: 'height_in', order: 15, type: 'NUMBER', required: true, label: 'Your height', helpText: 'In inches.' },
          {
            key: 'adherence', order: 20, type: 'SINGLE_CHOICE', required: true,
            label: 'How many doses did you miss in the last month?',
            options: [
              { value: '0', label: 'None' }, { value: '1', label: 'One' },
              { value: '2_3', label: 'Two or three' }, { value: '4_plus', label: 'Four or more' },
            ],
          },
          {
            key: 'side_effects', order: 30, type: 'MULTI_CHOICE',
            label: 'Have you had any of these side effects?', helpText: '(Select all that apply)',
            options: [
              { value: 'nausea', label: 'Nausea' }, { value: 'vomiting', label: 'Vomiting' },
              { value: 'severe_abdominal_pain', label: 'Severe abdominal pain' },
              { value: 'constipation', label: 'Constipation' }, { value: 'fatigue', label: 'Fatigue' },
              { value: 'none', label: 'None' },
            ],
          },
          { key: 'side_effect_detail', order: 40, type: 'TEXT', label: 'Tell us more about the abdominal pain', helpText: 'When did it start, and how severe is it?', showIf: { question: 'side_effects', op: 'includes', value: 'severe_abdominal_pain' } },
          { key: 'continue_plan', order: 50, type: 'SINGLE_CHOICE', required: true, label: 'Would you like to continue your current plan?', options: YES_NO },
        ],
      },
    },
  })

  return { intake, followUp }
}

const FLAG_RULES = [
  { key: 'mtc_men2_history', label: 'History of MTC or MEN2', severity: 'HIGH' as const,
    guidance: 'Protocol lists this as a contraindication for GLP-1 therapy. Physician review required before any plan is offered.',
    condition: { question: 'thyroid_mtc_history', op: 'eq', value: 'yes' } },
  { key: 'pregnancy', label: 'Pregnant, breastfeeding or planning', severity: 'HIGH' as const,
    guidance: 'Do not proceed with a treatment plan without direct physician contact.',
    condition: { any: [
      { question: 'pregnancy_status', op: 'eq', value: 'pregnant' },
      { question: 'pregnancy_status', op: 'eq', value: 'breastfeeding' },
      { question: 'pregnancy_status', op: 'eq', value: 'planning' },
    ] } },
  { key: 'recent_cardiac_event', label: 'Cardiac event within 12 months', severity: 'HIGH' as const,
    guidance: 'Request records from the treating cardiologist before review.',
    condition: { question: 'heart_event_recent', op: 'eq', value: 'yes' } },
  { key: 'pancreatitis_history', label: 'History of pancreatitis', severity: 'MEDIUM' as const,
    guidance: 'Physician to assess risk before prescribing.',
    condition: { question: 'pancreatitis_history', op: 'eq', value: 'yes' } },
  { key: 'uncontrolled_hypertension', label: 'Uncontrolled hypertension', severity: 'MEDIUM' as const,
    guidance: 'Consider deferring until blood pressure is managed.',
    condition: { all: [
      { question: 'conditions', op: 'includes', value: 'high_bp' },
      { question: 'bp_controlled', op: 'eq', value: 'no' },
    ] } },
  { key: 'eating_disorder_history', label: 'History of eating disorder', severity: 'MEDIUM' as const,
    guidance: 'Behavioural health input recommended before starting.',
    condition: { question: 'eating_disorder_history', op: 'eq', value: 'yes' } },
  { key: 'bmi_below_program', label: 'BMI below program threshold', severity: 'MEDIUM' as const,
    guidance: 'Below the BMI the practice normally treats. Confirm eligibility.',
    condition: { question: 'bmi', op: 'lt', value: 27 } },
  { key: 'high_alcohol_use', label: 'High weekly alcohol intake', severity: 'LOW' as const,
    guidance: 'Discuss interaction and pancreatitis risk at review.',
    condition: { question: 'alcohol_weekly', op: 'gte', value: 14 } },
  { key: 'severe_abdominal_pain', label: 'Severe abdominal pain reported', severity: 'HIGH' as const,
    guidance: 'Possible pancreatitis. Escalate the same day.',
    condition: { question: 'side_effects', op: 'includes', value: 'severe_abdominal_pain' } },
  { key: 'poor_adherence', label: 'Four or more missed doses', severity: 'LOW' as const,
    guidance: 'Check for access, cost or side-effect barriers.',
    condition: { question: 'adherence', op: 'eq', value: '4_plus' } },
]

/** Run the configured rules over one submission, exactly as the app does. */
async function raiseFlags(
  submissionId: string,
  answers: Record<string, unknown>,
  heightIn: number,
  weightLb: number,
  raisedAt: Date,
) {
  const bmiValue = Math.round(((703 * weightLb) / (heightIn * heightIn)) * 10) / 10
  const context = { ...answers, bmi: bmiValue }
  const rules = await prisma.flagRule.findMany({ where: { active: true } })
  let raised = 0
  for (const rule of rules) {
    if (evaluate(rule.condition as unknown as Condition, context)) {
      await prisma.raisedFlag.create({
        data: { submissionId, ruleId: rule.id, severity: rule.severity, raisedAt },
      })
      raised++
    }
  }
  return raised
}

/** Store a fixture through the real storage layer, so downloads actually work. */
async function storeDocument(
  patientId: string, file: string, filename: string, mime: string,
  kind: 'LAB_RESULT' | 'ID_DOCUMENT' | 'PROGRESS_PHOTO', uploadedAt: Date, shared: boolean,
) {
  const bytes = await fs.readFile(path.join(FIXTURES, file))
  const storageKey = newStorageKey()
  await putObject(storageKey, bytes)
  return prisma.document.create({
    data: {
      patientId, kind, filenameEnc: encrypt(filename), mimeType: mime,
      sizeBytes: bytes.length, storageKey, sharedWithCareTeam: shared, uploadedAt,
    },
  })
}

type AuditSeed = {
  actorId: string
  actorRole: 'PATIENT' | 'PHYSICIAN' | 'ADMIN'
  action: string
  entity: string
  entityId?: string
  patientId?: string
  createdAt: Date
  meta?: Record<string, unknown>
}

async function main() {
  console.log('Seeding MediLean…\n')
  await wipe()

  await prisma.eligibleState.createMany({
    data: STATES.map(([code, name, active]) => ({
      code, name, active,
      note: active ? null : 'Physician not currently licensed in this state.',
    })),
  })
  console.log(`  states            ${STATES.length} (${STATES.filter((s) => s[2]).length} accepting patients)`)

  const { intake, followUp } = await seedQuestionnaires()
  for (const rule of FLAG_RULES) {
    await prisma.flagRule.create({ data: { ...rule, condition: rule.condition as never } })
  }
  console.log(`  questionnaires    intake (${intake.questions.length} questions) + monthly check-in`)
  console.log(`  flag rules        ${FLAG_RULES.length}, all editable at /admin/flags\n`)

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const physician = await prisma.user.create({
    data: {
      email: 'dr.smith@medilean.test', passwordHash: hash, role: 'PHYSICIAN', status: 'ACTIVE',
      fullName: 'Dr. Alan Smith', emailVerifiedAt: daysAgo(200),
      lastLoginAt: new Date(now.getTime() - 4 * 60_000), createdAt: daysAgo(200),
    },
  })
  const admin = await prisma.user.create({
    data: {
      email: 'admin@medilean.test', passwordHash: hash, role: 'ADMIN', status: 'ACTIVE',
      fullName: 'Practice Admin', emailVerifiedAt: daysAgo(200),
      lastLoginAt: daysAgo(1), createdAt: daysAgo(200),
    },
  })

  const audits: AuditSeed[] = []
  let invoiceSeq = 0
  let flagTotal = 0
  let docTotal = 0

  for (const spec of PATIENTS) {
    const idx = PATIENTS.indexOf(spec)
    const dob = new Date(now.getFullYear() - spec.age, (spec.age * 7) % 12, ((spec.age * 3) % 27) + 1)
    const onPlan = spec.track === 'active' || spec.track === 'cancelled'

    const user = await prisma.user.create({
      data: {
        email: spec.email, passwordHash: hash, role: 'PATIENT', status: 'ACTIVE',
        fullName: spec.name,
        emailVerifiedAt: daysAgo(spec.submittedDaysAgo + 1),
        phoneEnc: encrypt(`+1 555 01${String(10 + idx).slice(-2)}`),
        phoneVerifiedAt: daysAgo(spec.submittedDaysAgo + 1),
        // Jane reads as "Active" in messaging; the others signed in a while back.
        lastLoginAt: spec.primary ? new Date(now.getTime() - 3 * 60_000) : daysAgo((idx % 6) + 1),
        createdAt: daysAgo(spec.submittedDaysAgo + 2),
        patientProfile: {
          create: {
            dobEnc: encrypt(dob.toISOString().slice(0, 10)),
            sex: spec.female ? 'FEMALE' : 'MALE',
            heightInches: spec.heightIn, stateCode: spec.state,
            addressEnc: encrypt(`${100 + idx} Example Street`),
            startingWeightLb: spec.startWeightLb, goalWeightLb: spec.goalWeightLb,
            programStartedAt: onPlan ? daysAgo(Math.max(1, spec.submittedDaysAgo - 1)) : null,
          },
        },
      },
    })

    audits.push({ actorId: user.id, actorRole: 'PATIENT', action: 'auth.signup', entity: 'User', entityId: user.id, patientId: user.id, createdAt: daysAgo(spec.submittedDaysAgo + 2) })
    audits.push({ actorId: user.id, actorRole: 'PATIENT', action: 'auth.email_verified', entity: 'User', entityId: user.id, patientId: user.id, createdAt: daysAgo(spec.submittedDaysAgo + 1) })

    // ------------------------------------------------------------- intake
    const status = TRACK_STATUS[spec.track]
    const reviewed = ['APPROVED', 'DECLINED', 'NEEDS_INFO'].includes(status)
    const decidedAt = daysAgo(Math.max(0, spec.submittedDaysAgo - 1))

    const submission = await prisma.submission.create({
      data: {
        patientId: user.id, questionnaireId: intake.id, status,
        submittedAt: status === 'DRAFT' ? null : daysAgo(spec.submittedDaysAgo),
        reviewedAt: reviewed ? decidedAt : null,
        reviewedById: reviewed ? physician.id : null,
        createdAt: daysAgo(spec.submittedDaysAgo + 1),
      },
    })

    const fullAnswers: Record<string, unknown> = {
      height_in: spec.heightIn, weight_lb: spec.startWeightLb, goal_weight_lb: spec.goalWeightLb,
      ...spec.answers,
    }
    for (const [key, value] of Object.entries(fullAnswers)) {
      await prisma.answer.create({ data: { submissionId: submission.id, questionKey: key, valueEnc: encryptJson(value) } })
    }

    if (status !== 'DRAFT') {
      flagTotal += await raiseFlags(submission.id, fullAnswers, spec.heightIn, spec.startWeightLb, daysAgo(spec.submittedDaysAgo))
      audits.push({ actorId: user.id, actorRole: 'PATIENT', action: 'submission.submit', entity: 'Submission', entityId: submission.id, patientId: user.id, createdAt: daysAgo(spec.submittedDaysAgo) })
    }

    if (spec.note) {
      await prisma.clinicalNote.create({
        data: {
          submissionId: submission.id, patientId: user.id, physicianId: physician.id,
          bodyEnc: encrypt(spec.note), createdAt: decidedAt,
        },
      })
      audits.push({ actorId: physician.id, actorRole: 'PHYSICIAN', action: 'submission.view', entity: 'Submission', entityId: submission.id, patientId: user.id, createdAt: decidedAt })
      audits.push({ actorId: physician.id, actorRole: 'PHYSICIAN', action: 'submission.decision', entity: 'Submission', entityId: submission.id, patientId: user.id, createdAt: decidedAt, meta: { to: status } })
    }

    if (spec.plan) {
      await prisma.treatmentPlan.create({
        data: {
          patientId: user.id, prescribedById: physician.id,
          medicationEnc: encrypt(spec.plan.medication),
          doseEnc: encrypt(spec.plan.dose),
          scheduleEnc: encrypt(spec.plan.schedule),
          status: spec.track === 'declined' ? 'ENDED' : 'ACTIVE',
          startedAt: daysAgo(Math.max(1, spec.submittedDaysAgo - 2)),
          endedAt: spec.track === 'declined' ? decidedAt : null,
        },
      })
    }

    // --------------------------------------------------- weight over time
    const drop = spec.startWeightLb - spec.weightLb
    const weeks = drop === 0 ? 0 : Math.max(4, Math.round(spec.submittedDaysAgo / 7))
    for (let w = 0; w <= weeks; w++) {
      const progress = weeks === 0 ? 1 : 1 - Math.pow(1 - w / weeks, 1.8)
      await prisma.weightEntry.create({
        data: {
          patientId: user.id,
          weightLb: Math.round((spec.startWeightLb - drop * progress) * 10) / 10,
          recordedAt: daysAgo((weeks - w) * 7),
          source: w === 0 ? 'intake' : 'follow_up',
        },
      })
    }

    // ------------------------------------------- completed monthly check-in
    if (spec.followUp && spec.followUpDaysAgo !== undefined) {
      const fu = await prisma.submission.create({
        data: {
          patientId: user.id, questionnaireId: followUp.id, status: 'SUBMITTED',
          submittedAt: daysAgo(spec.followUpDaysAgo), createdAt: daysAgo(spec.followUpDaysAgo),
        },
      })
      for (const [key, value] of Object.entries(spec.followUp)) {
        await prisma.answer.create({ data: { submissionId: fu.id, questionKey: key, valueEnc: encryptJson(value) } })
      }
      flagTotal += await raiseFlags(
        fu.id, spec.followUp, spec.heightIn,
        Number(spec.followUp['weight_lb']) || spec.weightLb,
        daysAgo(spec.followUpDaysAgo),
      )
      audits.push({ actorId: user.id, actorRole: 'PATIENT', action: 'followup.submit', entity: 'Submission', entityId: fu.id, patientId: user.id, createdAt: daysAgo(spec.followUpDaysAgo) })
    }

    if (spec.nextCheckInDays !== undefined) {
      await prisma.followUpSchedule.create({
        data: {
          patientId: user.id, questionnaireId: followUp.id, intervalDays: 30,
          nextDueAt: daysAhead(spec.nextCheckInDays),
          lastCompletedAt: spec.followUpDaysAgo !== undefined ? daysAgo(spec.followUpDaysAgo) : null,
        },
      })
    }

    // ------------------------------------------------------------- messages
    const thread = await prisma.thread.create({
      data: { patientId: user.id, createdAt: daysAgo(spec.submittedDaysAgo), lastMessageAt: daysAgo(spec.submittedDaysAgo) },
    })
    const convo: Array<['doctor' | 'patient', string, number]> =
      EXTRA_MESSAGES[spec.email] ?? [
        ['doctor', `Hi ${spec.name.split(' ')[0]}, thanks for completing your intake. I am reviewing it now.`, spec.submittedDaysAgo],
        ['patient', spec.lastMessage ?? 'Thank you.', Math.max(0, spec.submittedDaysAgo - 1)],
      ]
    let lastAt = daysAgo(spec.submittedDaysAgo)
    for (const [who, body, ago] of convo) {
      const fromDoctor = who === 'doctor'
      lastAt = daysAgo(ago)
      await prisma.message.create({
        data: {
          threadId: thread.id, senderId: fromDoctor ? physician.id : user.id,
          bodyEnc: encrypt(body), createdAt: lastAt,
          // Patients marked unread leave a badge on the clinician's bell.
          readAt: fromDoctor ? lastAt : spec.unread ? null : lastAt,
        },
      })
    }
    await prisma.thread.update({ where: { id: thread.id }, data: { lastMessageAt: lastAt } })

    // ------------------------------------------------------------ documents
    for (const kind of spec.documents ?? []) {
      if (kind === 'lab') {
        await storeDocument(user.id, 'lab_results.pdf', `Lab_Results_${now.getFullYear()}.pdf`, 'application/pdf', 'LAB_RESULT', daysAgo(6), true)
        docTotal++
      }
      if (kind === 'id') {
        await storeDocument(user.id, 'id_document.jpg', 'ID_Document.jpg', 'image/jpeg', 'ID_DOCUMENT', daysAgo(Math.max(1, spec.submittedDaysAgo - 1)), true)
        docTotal++
      }
      if (kind === 'photos') {
        const files = ['progress_1.jpg', 'progress_2.jpg', 'progress_3.jpg']
        for (let i = 0; i < files.length; i++) {
          await storeDocument(
            user.id, files[i], `Progress_Photo_${i + 1}.jpg`, 'image/jpeg', 'PROGRESS_PHOTO',
            daysAgo(Math.max(1, spec.submittedDaysAgo - 10 - i * 25)),
            // One stays private, which is the whole point of that control.
            i !== 1,
          )
          docTotal++
        }
      }
    }

    // --------------------------------------------------- billing + invoices
    const subStatus = spec.track === 'cancelled' ? 'CANCELED' : onPlan ? 'ACTIVE' : 'NONE'
    await prisma.subscription.create({
      data: {
        patientId: user.id, planName: 'Weight Management Program', priceCents: 29900,
        status: subStatus,
        currentPeriodEnd: subStatus === 'ACTIVE' ? daysAhead(30 - (spec.submittedDaysAgo % 30)) : null,
        cardBrand: onPlan ? ['visa', 'mastercard', 'amex'][idx % 3] : null,
        cardLast4: onPlan ? ['4242', '4444', '0005'][idx % 3] : null,
        cardExpMonth: onPlan ? 12 : null,
        cardExpYear: onPlan ? 2028 : null,
      },
    })

    for (let m = (spec.invoiceMonths ?? 0) - 1; m >= 0; m--) {
      const start = daysAgo(m * 30 + 5)
      invoiceSeq += 1
      const open = m === 0 && subStatus === 'ACTIVE'
      await prisma.invoice.create({
        data: {
          patientId: user.id,
          number: `ML-${now.getFullYear()}-${String(invoiceSeq).padStart(5, '0')}`,
          amountCents: 29900,
          status: open ? 'OPEN' : 'PAID',
          periodStart: start,
          periodEnd: new Date(start.getTime() + 30 * 864e5),
          issuedAt: start,
          paidAt: open ? null : start,
        },
      })
    }

    console.log(`  ${spec.name.padEnd(18)} ${spec.state}  ${spec.track.padEnd(10)} ${spec.plan ? spec.plan.medication : ''}`)
  }

  // One acknowledged flag, so the resolved state is visible somewhere.
  const resolvable = await prisma.raisedFlag.findFirst({
    where: { rule: { key: 'high_alcohol_use' } },
    include: { submission: true },
  })
  if (resolvable) {
    await prisma.raisedFlag.update({
      where: { id: resolvable.id },
      data: { resolvedAt: daysAgo(1), resolvedById: physician.id },
    })
    audits.push({ actorId: physician.id, actorRole: 'PHYSICIAN', action: 'flag.acknowledged', entity: 'RaisedFlag', entityId: resolvable.id, patientId: resolvable.submission.patientId, createdAt: daysAgo(1) })
  }

  // Two weeks of staff activity, so the access log reads like a real one.
  for (let d = 14; d >= 0; d--) {
    audits.push({ actorId: physician.id, actorRole: 'PHYSICIAN', action: 'auth.login', entity: 'User', entityId: physician.id, createdAt: daysAgo(d) })
    audits.push({ actorId: physician.id, actorRole: 'PHYSICIAN', action: 'queue.view', entity: 'Submission', createdAt: daysAgo(d) })
  }
  audits.push({ actorId: admin.id, actorRole: 'ADMIN', action: 'flag_rules.view', entity: 'FlagRule', createdAt: daysAgo(2) })
  audits.push({ actorId: admin.id, actorRole: 'ADMIN', action: 'flag_rule.toggle', entity: 'FlagRule', createdAt: daysAgo(2), meta: { key: 'high_alcohol_use', active: true } })
  audits.push({ actorId: admin.id, actorRole: 'ADMIN', action: 'eligible_state.toggle', entity: 'EligibleState', entityId: 'MI', createdAt: daysAgo(9), meta: { state: 'Michigan', active: true } })

  for (const a of audits) {
    await prisma.auditLog.create({
      data: {
        actorId: a.actorId, actorRole: a.actorRole, action: a.action, entity: a.entity,
        entityId: a.entityId ?? null, patientId: a.patientId ?? null,
        ip: `198.51.100.${10 + (a.createdAt.getDate() % 40)}`,
        userAgent: 'Mozilla/5.0 (seed)',
        meta: (a.meta ?? {}) as never,
        createdAt: a.createdAt,
      },
    })
  }

  console.log(`\n  flags raised      ${flagTotal}`)
  console.log(`  documents stored  ${docTotal} (real files, encrypted)`)
  console.log(`  invoices          ${invoiceSeq}`)
  console.log(`  audit events      ${audits.length}`)
  console.log('\nDemo accounts — password for all: ' + DEMO_PASSWORD)
  console.log('  patient    jane@example.com')
  console.log('  physician  dr.smith@medilean.test')
  console.log('  admin      admin@medilean.test')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
