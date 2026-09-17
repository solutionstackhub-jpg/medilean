/**
 * Demo data definitions.
 *
 * Kept separate from the seeding logic so the cast of patients is easy to read
 * and easy to extend. Every patient here is fictional and every clinical value
 * is invented; the point is to exercise each screen with something plausible,
 * not to model real medicine.
 */

export type Track =
  /** Submitted, waiting for a clinician. */
  | 'new'
  /** Picked up but not finished. */
  | 'in_review'
  /** Clinician asked for more detail. */
  | 'needs_info'
  /** Approved, on a plan, being followed up. */
  | 'active'
  /** Approved once, then the patient cancelled billing. */
  | 'cancelled'
  /** Reviewed and turned down. */
  | 'declined'
  /** Started the intake and stopped. */
  | 'draft'

export type PatientSpec = {
  email: string
  name: string
  state: string
  age: number
  female: boolean
  heightIn: number
  /** Weight at intake. */
  startWeightLb: number
  /** Weight now. Equal to the start unless they have been on a plan. */
  weightLb: number
  goalWeightLb: number
  track: Track
  /** How long ago the intake was submitted. */
  submittedDaysAgo: number
  answers: Record<string, unknown>
  /** Days until the next check-in. Negative means overdue. */
  nextCheckInDays?: number
  /** A completed monthly check-in, so the follow-up queue is not empty. */
  followUp?: Record<string, unknown>
  followUpDaysAgo?: number
  /** Physician's note, recorded with the decision. */
  note?: string
  plan?: { medication: string; dose: string; schedule: string }
  /** Months of paid invoices. */
  invoiceMonths?: number
  lastMessage?: string
  /** Patient has not read the clinician's last message. */
  unread?: boolean
  documents?: Array<'lab' | 'id' | 'photos'>
  primary?: boolean
}

const NO_CONDITIONS = {
  conditions: ['none'],
  pregnancy_status: 'no',
  prior_glp1: 'no',
  pancreatitis_history: 'no',
  eating_disorder_history: 'no',
}

export const PATIENTS: PatientSpec[] = [
  {
    email: 'jane@example.com', name: 'Jane Powell', state: 'CA', age: 36, female: true,
    heightIn: 65, startWeightLb: 194, weightLb: 182, goalWeightLb: 155,
    track: 'active', submittedDaysAgo: 96, primary: true,
    answers: { ...NO_CONDITIONS, conditions: ['high_bp'], bp_controlled: 'yes', alcohol_weekly: 3,
      current_meds: 'Lisinopril 10mg daily', allergies: 'None known' },
    nextCheckInDays: 7, followUpDaysAgo: 23,
    followUp: { weight_lb: 182, height_in: 65, adherence: '0', side_effects: ['nausea'], continue_plan: 'yes' },
    note: 'Intake reviewed. Hypertension controlled on lisinopril, no contraindications. Starting low dose with monthly review.',
    plan: { medication: 'Semaglutide', dose: '0.5 mg', schedule: 'Weekly injections' },
    invoiceMonths: 4, lastMessage: 'Thank you, that helps a lot.',
    documents: ['lab', 'id', 'photos'],
  },
  {
    email: 'emily.carter@example.com', name: 'Emily Carter', state: 'TX', age: 34, female: true,
    heightIn: 64, startWeightLb: 187, weightLb: 187, goalWeightLb: 150,
    track: 'new', submittedDaysAgo: 1,
    answers: { ...NO_CONDITIONS, alcohol_weekly: 2, current_meds: 'Multivitamin', allergies: 'Penicillin' },
    lastMessage: 'Thanks for the update!', unread: true,
  },
  {
    email: 'michael.roberts@example.com', name: 'Michael Roberts', state: 'FL', age: 42, female: false,
    heightIn: 70, startWeightLb: 218, weightLb: 205, goalWeightLb: 180,
    track: 'in_review', submittedDaysAgo: 2,
    answers: { ...NO_CONDITIONS, conditions: ['sleep_apnea'], prior_glp1: 'yes',
      prior_glp1_detail: 'Wegovy for four months, stopped due to cost.', alcohol_weekly: 6,
      current_meds: 'CPAP, no medication', allergies: 'None' },
    lastMessage: 'Lab results attached.', unread: true, documents: ['lab'],
  },
  {
    email: 'sarah.kim@example.com', name: 'Sarah Kim', state: 'NY', age: 28, female: true,
    heightIn: 66, startWeightLb: 172, weightLb: 172, goalWeightLb: 150,
    track: 'needs_info', submittedDaysAgo: 2,
    answers: { ...NO_CONDITIONS, conditions: ['thyroid'], thyroid_mtc_history: 'no',
      pregnancy_status: 'planning', alcohol_weekly: 1,
      current_meds: 'Levothyroxine 50mcg', allergies: 'Sulfa drugs' },
    note: 'Patient is planning a pregnancy within 12 months. Cannot proceed without a direct conversation about timing. Asked for more detail.',
    lastMessage: 'I have a question about the dosing schedule.', unread: true,
  },
  {
    email: 'david.wilson@example.com', name: 'David Wilson', state: 'IL', age: 51, female: false,
    heightIn: 71, startWeightLb: 245, weightLb: 245, goalWeightLb: 200,
    track: 'new', submittedDaysAgo: 3,
    answers: {
      conditions: ['diabetes_t2', 'high_bp', 'heart_disease'],
      diabetes_meds: 'Metformin 1000mg twice daily', bp_controlled: 'no', heart_event_recent: 'yes',
      pregnancy_status: 'no', prior_glp1: 'no', pancreatitis_history: 'yes',
      eating_disorder_history: 'no', alcohol_weekly: 16,
      current_meds: 'Metformin, Atorvastatin, Aspirin', allergies: 'None known',
    },
    lastMessage: 'What are the next steps?', unread: true,
  },
  {
    email: 'jessica.lee@example.com', name: 'Jessica Lee', state: 'WA', age: 39, female: true,
    heightIn: 63, startWeightLb: 178, weightLb: 178, goalWeightLb: 145,
    track: 'new', submittedDaysAgo: 3,
    answers: { ...NO_CONDITIONS, alcohol_weekly: 4, current_meds: 'None', allergies: 'None' },
    lastMessage: 'Thank you!',
  },

  // ---------------------------------------------- longer-running patients
  {
    email: 'marcus.bell@example.com', name: 'Marcus Bell', state: 'GA', age: 45, female: false,
    heightIn: 72, startWeightLb: 262, weightLb: 241, goalWeightLb: 215,
    track: 'active', submittedDaysAgo: 140,
    answers: { ...NO_CONDITIONS, conditions: ['sleep_apnea', 'high_bp'], bp_controlled: 'yes',
      alcohol_weekly: 8, current_meds: 'Amlodipine 5mg', allergies: 'None' },
    nextCheckInDays: -4, followUpDaysAgo: 34,
    followUp: { weight_lb: 241, height_in: 72, adherence: '2_3', side_effects: ['constipation', 'fatigue'], continue_plan: 'yes' },
    note: 'Good candidate. Sleep apnoea and controlled hypertension. Started on a standard titration.',
    plan: { medication: 'Tirzepatide', dose: '2.5 mg', schedule: 'Weekly injections' },
    invoiceMonths: 5, lastMessage: 'The constipation has eased off, thanks.',
    documents: ['lab'],
  },
  {
    email: 'priya.raman@example.com', name: 'Priya Raman', state: 'NJ', age: 31, female: true,
    heightIn: 62, startWeightLb: 168, weightLb: 159, goalWeightLb: 140,
    track: 'active', submittedDaysAgo: 74,
    answers: { ...NO_CONDITIONS, alcohol_weekly: 0, current_meds: 'None', allergies: 'Latex' },
    nextCheckInDays: 2, followUpDaysAgo: 3,
    // This check-in trips the "severe abdominal pain" rule, so a flagged
    // follow-up appears in the queue rather than only flagged intakes.
    followUp: { weight_lb: 159, height_in: 62, adherence: '1',
      side_effects: ['nausea', 'severe_abdominal_pain'],
      side_effect_detail: 'Started two days ago, worse after eating. Sharp rather than cramping.',
      continue_plan: 'yes' },
    note: 'Healthy 31 year old, no contraindications. Started at the lowest dose.',
    plan: { medication: 'Semaglutide', dose: '0.25 mg', schedule: 'Weekly injections' },
    invoiceMonths: 2, lastMessage: 'I flagged some stomach pain in my check-in.', unread: true,
    documents: ['photos'],
  },
  {
    email: 'luis.moreno@example.com', name: 'Luis Moreno', state: 'NV', age: 38, female: false,
    heightIn: 69, startWeightLb: 224, weightLb: 210, goalWeightLb: 190,
    track: 'active', submittedDaysAgo: 58,
    answers: { ...NO_CONDITIONS, alcohol_weekly: 5, current_meds: 'None', allergies: 'None' },
    nextCheckInDays: 19, followUpDaysAgo: 11,
    followUp: { weight_lb: 210, height_in: 69, adherence: '0', side_effects: ['none'], continue_plan: 'yes' },
    note: 'Straightforward. No contraindications, good baseline bloods.',
    plan: { medication: 'Semaglutide', dose: '1.0 mg', schedule: 'Weekly injections' },
    invoiceMonths: 2, lastMessage: 'Down another two pounds this month.',
  },
  {
    email: 'nina.osei@example.com', name: 'Nina Osei', state: 'NC', age: 29, female: true,
    heightIn: 67, startWeightLb: 186, weightLb: 179, goalWeightLb: 160,
    track: 'cancelled', submittedDaysAgo: 112,
    answers: { ...NO_CONDITIONS, alcohol_weekly: 2, current_meds: 'None', allergies: 'None' },
    nextCheckInDays: 30,
    note: 'Approved and started. Patient later cancelled billing for cost reasons.',
    plan: { medication: 'Semaglutide', dose: '0.5 mg', schedule: 'Weekly injections' },
    invoiceMonths: 3, lastMessage: 'I need to pause for a few months, sorry.',
  },
  {
    email: 'tom.alvarez@example.com', name: 'Tom Alvarez', state: 'OH', age: 58, female: false,
    heightIn: 68, startWeightLb: 176, weightLb: 176, goalWeightLb: 165,
    track: 'declined', submittedDaysAgo: 21,
    answers: { ...NO_CONDITIONS, conditions: ['thyroid'], thyroid_mtc_history: 'yes',
      alcohol_weekly: 3, current_meds: 'Levothyroxine 75mcg', allergies: 'None' },
    note: 'Family history of medullary thyroid carcinoma. Protocol lists this as a contraindication for GLP-1 therapy, so declined and referred back to primary care.',
    lastMessage: 'Understood, thank you for explaining.',
  },
  {
    email: 'chris.baker@example.com', name: 'Chris Baker', state: 'AZ', age: 47, female: false,
    heightIn: 73, startWeightLb: 251, weightLb: 251, goalWeightLb: 210,
    track: 'new', submittedDaysAgo: 5,
    answers: { ...NO_CONDITIONS, eating_disorder_history: 'yes', alcohol_weekly: 18,
      current_meds: 'Sertraline 50mg', allergies: 'None' },
    lastMessage: 'Submitted my intake yesterday.',
  },
  {
    email: 'dana.whitfield@example.com', name: 'Dana Whitfield', state: 'PA', age: 52, female: true,
    heightIn: 64, startWeightLb: 213, weightLb: 213, goalWeightLb: 175,
    track: 'in_review', submittedDaysAgo: 4,
    answers: { ...NO_CONDITIONS, conditions: ['diabetes_t2', 'high_bp'],
      diabetes_meds: 'Metformin 500mg twice daily', bp_controlled: 'no',
      alcohol_weekly: 1, current_meds: 'Metformin, Losartan', allergies: 'Codeine' },
    lastMessage: 'Happy to send more records if useful.',
  },
  {
    email: 'amy.fischer@example.com', name: 'Amy Fischer', state: 'MI', age: 44, female: true,
    heightIn: 66, startWeightLb: 199, weightLb: 199, goalWeightLb: 170,
    track: 'draft', submittedDaysAgo: 2,
    answers: { height_in: 66, weight_lb: 199, goal_weight_lb: 170 },
  },
]

/** Conversations, so the messaging screens are not three identical threads. */
export const EXTRA_MESSAGES: Record<string, Array<['doctor' | 'patient', string, number]>> = {
  'jane@example.com': [
    ['doctor', 'Hi Jane, your latest numbers look good. Please continue the current dose and let me know if anything changes.', 6],
    ['patient', 'Great, thank you. I am feeling well so far.', 5],
    ['doctor', 'Good to hear. We will check in again in about a week.', 4],
    ['patient', 'Thank you, that helps a lot.', 3],
  ],
  'priya.raman@example.com': [
    ['doctor', 'Priya, thanks for completing your check-in.', 3],
    ['patient', 'I flagged some stomach pain in my check-in.', 2],
    ['doctor', 'I have seen it and flagged it for same-day review. Please stop the next dose until we speak.', 1],
  ],
  'marcus.bell@example.com': [
    ['doctor', 'Marcus, your check-in mentioned constipation. Increase water and fibre, and tell me if it persists.', 20],
    ['patient', 'The constipation has eased off, thanks.', 14],
  ],
  'tom.alvarez@example.com': [
    ['doctor', 'Tom, I am not able to offer this programme given the family history you described. I have written to your GP.', 19],
    ['patient', 'Understood, thank you for explaining.', 18],
  ],
}
