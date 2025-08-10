// backend/src/routes/payments.js
import express from 'express'
import Stripe from 'stripe'
import { db, saveBookings } from '../store.mjs'
import { finalizeBooking } from '../services/finalizeBooking.mjs'

const router = express.Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

// Create a Stripe Checkout Session for the 50% deposit
router.post('/checkout', async (req, res) => {
  try {
    const { booking_id } = req.body || {}
    const b = db.bookings.find(x => x.id === booking_id)
    if (!b) return res.status(404).json({ error: 'booking not found' })

    const amountCents = b.amount_deposit // deposit already computed in /create
    const successUrl = `${process.env.PUBLIC_FRONTEND_URL || ''}/?status=success`
    const cancelUrl  = `${process.env.PUBLIC_FRONTEND_URL || ''}/?status=cancelled`

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
      metadata: { booking_id },
      success_url: successUrl,
      cancel_url: cancelUrl
    })

    res.json({ url: session.url })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'stripe checkout error' })
  }
})

// Webhook (MUST be raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const cs = event.data.object
      const booking_id = cs.metadata?.booking_id
      const payment_intent_id = cs.payment_intent || cs.id
      if (booking_id) {
        await finalizeBooking({ db, saveBookings }, { booking_id, payment_intent_id })
      }
    }
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).send('Webhook failed')
  }
})

export default router
