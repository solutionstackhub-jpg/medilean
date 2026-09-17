import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { stripe } from '@/lib/stripe'

/**
 * Stripe webhook.
 *
 * Signature is verified before anything is read, because an unverified webhook
 * is just an unauthenticated write endpoint. Only subscription state is taken
 * from the payload; nothing clinical is stored or expected here.
 */
export async function POST(req: Request) {
  const client = stripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!client || !secret) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const body = await req.text()

  let event
  try {
    event = client.webhooks.constructEvent(body, signature, secret)
  } catch {
    await audit({ action: 'stripe.webhook_bad_signature', entity: 'Subscription' })
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object
      const patientId = s.client_reference_id
      if (patientId) {
        await prisma.subscription.updateMany({
          where: { patientId },
          data: {
            status: 'ACTIVE',
            stripeCustomerId: typeof s.customer === 'string' ? s.customer : null,
            stripeSubscriptionId: typeof s.subscription === 'string' ? s.subscription : null,
          },
        })
        await audit({
          action: 'subscription.activated',
          entity: 'Subscription',
          patientId,
          meta: { event: event.type },
        })
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const s = event.data.object
      const map: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING'> = {
        active: 'ACTIVE',
        trialing: 'TRIALING',
        past_due: 'PAST_DUE',
        unpaid: 'PAST_DUE',
        canceled: 'CANCELED',
      }
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: s.id },
        data: {
          status: map[s.status] ?? 'CANCELED',
          currentPeriodEnd: s.items.data[0]?.current_period_end
            ? new Date(s.items.data[0].current_period_end * 1000)
            : null,
        },
      })
      await audit({ action: 'subscription.sync', entity: 'Subscription', meta: { event: event.type, status: s.status } })
      break
    }

    default:
      // Everything else is acknowledged and ignored, so Stripe stops retrying.
      break
  }

  return NextResponse.json({ received: true })
}
