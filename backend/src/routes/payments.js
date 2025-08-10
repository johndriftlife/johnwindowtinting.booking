// backend/src/routes/payments.js
import express from 'express'
import Stripe from 'stripe'
import { db, saveBookings } from '../store.mjs'
import { finalizeBooking } from '../services/finalizeBooking.mjs'

const router = express.Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

// Create PaymentIntent (example endpoint if you need one)
router.post('/create-intent', async (req, res) => {
  try {
    const { booking_id, amount_cents, currency = 'eur' } = req.body || {}
    if (!booking_id || !amount_cents) return res.status(400).json({ error: 'missing fields' })

    const intent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency,
      metadata: { booking_id },
      automatic_payment_methods: { enabled: true },
    })
    res.json({ client_secret: intent.client_secret })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'stripe error' })
  }
})

// Stripe webhook (must be raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!whSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET')
      return res.status(500).send('Webhook not configured')
    }
    event = stripe.webhooks.constructEvent(req.body, sig, whSecret)
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const booking_id = pi.metadata?.booking_id
        if (booking_id) {
          await finalizeBooking({ db, saveBookings }, { booking_id, payment_intent_id: pi.id })
        }
        break
      }
      case 'checkout.session.completed': {
        const cs = event.data.object
        // For Checkout Sessions, the PaymentIntent id is cs.payment_intent
        const booking_id = cs.metadata?.booking_id
        const payment_intent_id = cs.payment_intent || cs.id
        if (booking_id) {
          await finalizeBooking({ db, saveBookings }, { booking_id, payment_intent_id })
        }
        break
      }
      default:
        // ignore others
        break
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).send('Webhook handler failed')
  }
})

export default router
