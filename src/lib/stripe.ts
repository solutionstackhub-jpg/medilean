import Stripe from 'stripe'

/**
 * Stripe.
 *
 * Card details never reach this application: the patient is sent to Stripe's
 * hosted Checkout and we keep a customer reference and the last four digits
 * Stripe reports back. That keeps PCI scope small.
 *
 * Nothing clinical is ever sent to Stripe. Not in metadata, not in the product
 * name, not in a receipt description. Stripe has no BAA for most accounts, and
 * it does not need one if no PHI crosses the line.
 */

let cached: Stripe | null = null

export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!cached) cached = new Stripe(key)
  return cached
}

/** True when no Stripe key is configured, so billing runs in a local simulation. */
export function isSimulated(): boolean {
  return !process.env.STRIPE_SECRET_KEY
}

/**
 * The only metadata we attach. An opaque internal id, nothing a Stripe
 * dashboard user could read as a diagnosis.
 */
export function safeMetadata(patientId: string): Record<string, string> {
  return { medilean_patient_ref: patientId }
}
