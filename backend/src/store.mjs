// backend/src/routes/payments.js
import { Router } from 'express'
import Stripe from 'stripe'
import { db, markPaid } from '../store.mjs'
import { createCalendarEventSafe } from '../services/googleCalendar.mjs'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

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
  } catch (err) { console.error('Webhook signature verify failed:', err?.message); return res.status(400).send(`Webhook Error: ${err.message}`) }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const bookingId = session.metadata?.booking_id
    const rec = markPaid(bookingId)
    if (rec) {
      console.log('Booking finalized via Checkout:', rec.id)
      try { await createCalendarEventSafe(rec) } catch (e) { console.log('Calendar create failed:', e?.message || e) }
    }
  }
  res.json({ received:true })
}

export default router
