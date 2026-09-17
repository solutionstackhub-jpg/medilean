'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { requireVerifiedPatient } from '@/lib/auth'
import { stripe, isSimulated, safeMetadata } from '@/lib/stripe'

export type BillingState = { error?: string; ok?: string }

function periodBounds(from = new Date()) {
  const end = new Date(from.getTime() + 30 * 864e5)
  return { start: from, end }
}

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.invoice.count()
  return `ML-${year}-${String(count + 1).padStart(5, '0')}`
}

/**
 * Start a subscription.
 *
 * With a Stripe key this creates a hosted Checkout session. Without one it
 * completes locally so the rest of the product can be demonstrated without
 * credentials. Either way no card data touches this application.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature fixed by useActionState
export async function startSubscription(_prev: BillingState, _formData: FormData): Promise<BillingState> {
  const session = await requireVerifiedPatient()

  const sub = await prisma.subscription.upsert({
    where: { patientId: session.userId },
    create: { patientId: session.userId },
    update: {},
  })

  const client = stripe()

  if (!client || isSimulated()) {
    const { start, end } = periodBounds()
    await prisma.$transaction([
      prisma.subscription.update({
        where: { patientId: session.userId },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: end,
          cardBrand: 'visa',
          cardLast4: '4242',
          cardExpMonth: 12,
          cardExpYear: 2028,
        },
      }),
      prisma.invoice.create({
        data: {
          patientId: session.userId,
          number: await nextInvoiceNumber(),
          amountCents: sub.priceCents,
          status: 'PAID',
          periodStart: start,
          periodEnd: end,
          paidAt: new Date(),
        },
      }),
    ])
    await audit({
      actorId: session.userId, actorRole: session.role,
      action: 'subscription.activated_simulated', entity: 'Subscription',
      entityId: sub.id, patientId: session.userId,
    })
    revalidatePath('/billing')
    revalidatePath('/billing/invoices')
    return { ok: 'Subscription active. Stripe is running in local simulation mode.' }
  }

  const base = process.env.APP_URL || 'http://localhost:3000'
  const checkout = await client.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${base}/billing?started=1`,
    cancel_url: `${base}/billing`,
    client_reference_id: session.userId,
    metadata: safeMetadata(session.userId),
  })

  await audit({
    actorId: session.userId, actorRole: session.role,
    action: 'subscription.checkout_created', entity: 'Subscription',
    entityId: sub.id, patientId: session.userId,
  })

  if (!checkout.url) return { error: 'Stripe did not return a checkout link.' }
  redirect(checkout.url)
}

export async function cancelSubscription(): Promise<void> {
  const session = await requireVerifiedPatient()
  const sub = await prisma.subscription.findUnique({ where: { patientId: session.userId } })
  if (!sub) return

  const client = stripe()
  if (client && sub.stripeSubscriptionId) {
    await client.subscriptions.cancel(sub.stripeSubscriptionId)
  }

  await prisma.subscription.update({
    where: { patientId: session.userId },
    data: { status: 'CANCELED' },
  })
  await audit({
    actorId: session.userId, actorRole: session.role,
    action: 'subscription.canceled', entity: 'Subscription',
    entityId: sub.id, patientId: session.userId,
  })
  revalidatePath('/billing')
  revalidatePath('/billing/subscription')
}

export async function resumeSubscription(): Promise<void> {
  const session = await requireVerifiedPatient()
  const sub = await prisma.subscription.findUnique({ where: { patientId: session.userId } })
  if (!sub || sub.status !== 'CANCELED') return

  await prisma.subscription.update({
    where: { patientId: session.userId },
    data: { status: 'ACTIVE', currentPeriodEnd: periodBounds().end },
  })
  await audit({
    actorId: session.userId, actorRole: session.role,
    action: 'subscription.resumed', entity: 'Subscription',
    entityId: sub.id, patientId: session.userId,
  })
  revalidatePath('/billing')
  revalidatePath('/billing/subscription')
}

/**
 * Replace the card on file.
 *
 * In production this opens Stripe's billing portal, so the new number is typed
 * into Stripe and never into MediLean. Simulated mode just records the last four
 * so the screen has something truthful to show.
 */
export async function updatePaymentMethod(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const session = await requireVerifiedPatient()
  const sub = await prisma.subscription.findUnique({ where: { patientId: session.userId } })
  if (!sub) return { error: 'No subscription to update.' }

  const client = stripe()
  if (client && sub.stripeCustomerId) {
    const base = process.env.APP_URL || 'http://localhost:3000'
    const portal = await client.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${base}/billing/methods`,
    })
    await audit({
      actorId: session.userId, actorRole: session.role,
      action: 'payment_method.portal_opened', entity: 'Subscription',
      entityId: sub.id, patientId: session.userId,
    })
    redirect(portal.url)
  }

  const last4 = String(formData.get('last4') ?? '').trim()
  const brand = String(formData.get('brand') ?? 'visa').trim().toLowerCase()
  const expMonth = Number(formData.get('expMonth'))
  const expYear = Number(formData.get('expYear'))

  if (!/^\d{4}$/.test(last4)) return { error: 'Enter the last four digits of the card.' }
  if (!(expMonth >= 1 && expMonth <= 12)) return { error: 'Expiry month must be between 1 and 12.' }
  if (!(expYear >= new Date().getFullYear() && expYear <= 2100)) return { error: 'That expiry year is in the past.' }

  await prisma.subscription.update({
    where: { patientId: session.userId },
    data: { cardBrand: brand, cardLast4: last4, cardExpMonth: expMonth, cardExpYear: expYear },
  })
  await audit({
    actorId: session.userId, actorRole: session.role,
    action: 'payment_method.updated', entity: 'Subscription',
    entityId: sub.id, patientId: session.userId,
    meta: { brand, last4 },
  })

  revalidatePath('/billing')
  revalidatePath('/billing/methods')
  return { ok: 'Card updated.' }
}
