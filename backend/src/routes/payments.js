import { Router } from 'express'
import Stripe from 'stripe'
import { db, markPaid } from '../store.mjs'
import { createCalendarEventSafe } from '../services/googleCalendar.mjs'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

// Inline Payment: returns clientSecret
router.post('/intent', async (req, res) => {
  try {
    const { booking_id } = req.body || {}
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' })
    const booking = db.bookings.find(b => b.id === booking_id)
    if (!booking) return res.status(404).json({ error: 'booking not found' })
    const depositCents = booking.amount_deposit || Math.floor((booking.amount_total || 0) * 0.5)
    if (!Number.isFinite(depositCents) || depositCents <= 0) return res.status(400).json({ error: 'invalid amount' })

    const pi = await stripe.paymentIntents.create({
      amount: depositCents,
      currency: 'eur',
      metadata: { booking_id: booking.id, purpose: 'deposit' },
      receipt_email: booking.email,
      automatic_payment_methods: { enabled: true }
    })
    res.json({ clientSecret: pi.client_secret })
  } catch (e) {
    console.error('intent error', e)
    res.status(500).json({ error: 'stripe error' })
  }
})

// (optional) legacy checkout kept
router.post('/checkout', async (req, res) => {
  try {
    const { booking_id } = req.body || {}
    if (!booking_id) return res.status(400).json({ error:'booking_id required' })
    const booking = db.bookings.find(b => b.id === booking_id)
    if (!booking) return res.status(404).json({ error:'booking not found' })
    const depositCents = booking.amount_deposit || Math.floor((booking.amount_total || 0) * 0.5)
    if (depositCents <= 0) return res.status(400).json({ error:'invalid amount' })
    const success = (process.env.FRONTEND_URL || '').replace(/\/$/,'') + '/?success=1'
    const cancel  = (process.env.FRONTEND_URL || '').replace(/\/$/,'') + '/?canceled=1'
    const session = await stripe.checkout.sessions.create({
      mode:'payment',
      success_url: success,
      cancel_url: cancel,
      customer_email: booking.email,
      metadata: { booking_id: booking.id },
      line_items:[{ quantity:1, price_data:{ currency:'eur', unit_amount: depositCents, product_data:{ name:`Deposit for ${booking.full_name}`, description:`Appointment ${booking.date} ${booking.start_time}` } } }]
    })
    res.json({ url: session.url })
  } catch (e) { console.error('checkout error', e); res.status(500).json({ error:'stripe error' }) }
})

export async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature']
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  let event
  try {
    event = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })
      .webhooks.constructEvent(req.body, sig, whSecret)
  } catch (err) {
    console.error('Webhook verify failed:', err?.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      const bookingId = pi.metadata?.booking_id
      const rec = markPaid(bookingId)
      if (rec) { try { await createCalendarEventSafe(rec) } catch {} }
    }
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object
      const rec = markPaid(s.metadata?.booking_id)
      if (rec) { try { await createCalendarEventSafe(rec) } catch {} }
    }
  } catch (e) { console.error('Webhook handler error:', e) }

  res.json({ received:true })
}

export default router
