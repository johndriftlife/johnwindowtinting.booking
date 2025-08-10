import express from 'express'
import Stripe from 'stripe'
import { db } from '../store.js'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const router = express.Router()

// Create a Stripe Checkout session
router.post('/checkout', async (req, res) => {
  try {
    const { booking_id } = req.body
    if (!booking_id) {
      return res.status(400).json({ error: 'Missing booking_id' })
    }

    // Find booking
    const booking = db.bookings.find(b => b.id === booking_id)
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Calculate deposit amount (50%)
    const values = {
      carbon: { front_doors: 4000, rear_doors: 4000, front_windshield: 8000, rear_windshield: 8000 },
      ceramic: { front_doors: 6000, rear_doors: 6000, front_windshield: 10000, rear_windshield: 10000 }
    }

    const amount_total = booking.windows.reduce((sum, w) => sum + (values[booking.tint_quality][w] || 0), 0)
    const amount_deposit = Math.floor(amount_total * 0.5)

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Booking Deposit – ${booking.full_name}`,
              description: `Date: ${booking.date} Time: ${booking.start_time}`
            },
            unit_amount: amount_deposit
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.FRONTEND_URL}/success?booking_id=${booking.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel?booking_id=${booking.id}`,
      metadata: { booking_id: booking.id }
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: 'Payment failed to start' })
  }
})

// Stripe webhook for payment confirmation
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const booking_id = session.metadata?.booking_id
    if (booking_id) {
      const booking = db.bookings.find(b => b.id === booking_id)
      if (booking) {
        booking.payment_status = 'paid'
      }
    }
  }

  res.json({ received: true })
})

export default router
