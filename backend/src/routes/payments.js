// backend/src/routes/payments.js
import express from 'express'
import Stripe from 'stripe'
import { db, saveBookings } from '../store.mjs'
import { finalizeBooking } from '../services/finalizeBooking.mjs'

const router = express.Router()

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = new Stripe(stripeKey || '', { apiVersion: '2024-06-20' })

function getFrontendBase(req) {
  // Prefer explicit env; fallback to request origin; last-resort to Render guess
  const envUrl = process.env.PUBLIC_FRONTEND_URL
  const origin = req.headers.origin
  return envUrl || origin || ''
}

// Create a Stripe Checkout Session for the 50% deposit
router.post('/checkout', async (req, res) => {
  try {
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe key not configured (STRIPE_SECRET_KEY)' })
    }

    const { booking_id } = req.body || {}
    const b = db.bookings.find(x => x.id === booking_id)
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const amountCents = Number(b.amount_deposit || 0)
    if (!amountCents || amountCents < 50) {
      return res.status(400).json({ error: 'Deposit amount invalid' })
    }

    const base = getFrontendBase(req)
    if (!base) {
      return res.status(500).json({ error: 'PUBLIC_FRONTEND_URL not set and no Origin header' })
    }

    const successUrl = `${base}/?status=success&b=${encodeURIComponent(b.id)}`
    const cancelUrl  = `${base}/?status=cancelled&b=${encodeURIComponent(b.id)}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Deposit for booking #${b.id}` },
          unit_amount: amountCents
        },
        quantity: 1
      }],
      // IMPORTANT: used by webhook to finalize
      metadata: { booking_id: b.id },
      success_url: successUrl,
      cancel_url: cancelUrl
    })

    if (!session?.url) {
      return res.status(500).json({ error: 'Stripe did not return a Checkout URL' })
    }

    res.json({ url: session.url })
  } catch (e) {
    // Show a helpful error without leaking secrets
    const msg = e?.raw?.message || e?.message || 'Stripe checkout error'
    console.error('Checkout error:', msg)
    res.status(500).json({ error: msg })
  }
})

// Webhook (MUST be raw body)
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
          await finalizeBooking({ db, saveBookings }, { booking_id, payment_intent_id })
        }
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const booking_id = pi.metadata?.booking_id
        if (booking_id) {
          await finalizeBooking({ db, saveBookings }, { booking_id, payment_intent_id: pi.id })
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
