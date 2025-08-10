// backend/src/routes/payments.js
import express from 'express'
import Stripe from 'stripe'
import dotenv from 'dotenv'
import { db, saveBookings } from '../store.mjs' // <-- change to '../store.js' if your file is .js

dotenv.config()

const router = express.Router()
const stripeKey = process.env.STRIPE_SECRET_KEY || ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

function getFrontendBase(req) {
  // Prefer explicit env; fallback to browser Origin header
  return process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || req.headers.origin || ''
}

/**
 * RECOMMENDED FLOW
 * Create a Stripe Checkout Session for the 50% deposit and redirect user to Stripe
 * POST /api/payments/checkout  { booking_id }
 * -> { url: 'https://checkout.stripe.com/...' }
 */
router.post('/checkout', async (req, res) => {
  try {
    if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })

    const { booking_id } = req.body || {}
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' })

    const b = db.bookings.find(x => x.id === booking_id)
    if (!b) return res.status(404).json({ error: 'booking not found' })

    const amountCents = Number(b.amount_deposit || 0)
    if (!amountCents || amountCents < 50) {
      return res.status(400).json({ error: 'deposit amount invalid' })
    }

    const base = getFrontendBase(req)
    if (!base) {
      return res.status(500).json({ error: 'Set FRONTEND_URL (or PUBLIC_FRONTEND_URL) in env' })
    }

    const success_url = `${base}/?status=success&b=${encodeURIComponent(b.id)}`
    const cancel_url  = `${base}/?status=cancelled&b=${encodeURIComponent(b.id)}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Deposit for booking #${b.id}`, description: `Date ${b.date} • ${b.start_time}-${b.end_time}` },
          unit_amount: amountCents
        },
        quantity: 1
      }],
      metadata: { booking_id: b.id },
      success_url,
      cancel_url
    })

    if (!session?.url) return res.status(500).json({ error: 'Stripe did not return a Checkout URL' })
    res.json({ url: session.url })
  } catch (e) {
    const msg = e?.raw?.message || e?.message || 'Stripe checkout error'
    console.error('Checkout error:', msg)
    res.status(500).json({ error: msg })
  }
})

/**
 * COMPATIBILITY FLOW (for old frontend calling /create-payment-intent)
 * Creates a PaymentIntent and returns client_secret for Payment Element.
 * POST /api/payments/create-payment-intent  { booking_id }
 * -> { client_secret: 'pi_..._secret_...' }
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })

    const { booking_id } = req.body || {}
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' })

    const b = db.bookings.find(x => x.id === booking_id)
    if (!b) return res.status(404).json({ error: 'booking not found' })

    const amount = Number(b.amount_deposit || 0)
    if (!amount || amount < 50) return res.status(400).json({ error: 'deposit amount invalid' })

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: { booking_id }
    })

    res.json({ client_secret: intent.client_secret })
  } catch (e) {
    const msg = e?.raw?.message || e?.message || 'stripe error'
    console.error('PI error:', msg)
    res.status(500).json({ error: msg })
  }
})

/**
 * STRIPE WEBHOOK
 * Mount this router BEFORE express.json() in server.js:
 *   app.use('/api/payments', paymentsRouter)
 * Then add standard middleware.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!whSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET')
      return res.status(500).send('Webhook not configured')
    }
    const event = stripe.webhooks.constructEvent(req.body, sig, whSecret)

    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = event.data.object
        const booking_id = cs.metadata?.booking_id
        const payment_intent_id = cs.payment_intent || cs.id
        if (booking_id) {
          const b = db.bookings.find(x => x.id === booking_id)
          if (b) {
            b.payment_status = 'paid'
            b.payment_intent_id = payment_intent_id
            b.status = 'deposit_paid'
            await saveBookings()
            console.log('Booking finalized via Checkout:', booking_id)
          }
        }
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const booking_id = pi.metadata?.booking_id
        if (booking_id) {
          const b = db.bookings.find(x => x.id === booking_id)
          if (b) {
            b.payment_status = 'paid'
            b.payment_intent_id = pi.id
            b.status = 'deposit_paid'
            await saveBookings()
            console.log('Booking finalized via PI:', booking_id)
          }
        }
        break
      }
      default:
        break
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err?.message || err)
    res.status(400).send('Webhook error')
  }
})

export default router
