import { Router } from 'express'
import Stripe from 'stripe'
import { db, markPaid } from '../store.mjs'
import { createCalendarEventSafe } from '../services/googleCalendar.mjs'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

// NEW: inline-payments PaymentIntent
router.post('/intent', async (req, res) => {
  try {
    const { booking_id } = req.body || {}
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' })
    const booking = db.bookings.find(b => b.id === booking_id)
    if (!booking) return res.status(404).json({ error: 'booking not found' })

    const depositCents = booking.amount_deposit || Math.floor((booking.amount_total || 0) * 0.5)
    if (!Number.isFinite(depositCents) || depositCents <= 0) {
      return res.status(400).json({ error: 'invalid amount' })
    }

    const pi = await stripe.paymentIntents.create({
      amount: depositCents,
      currency: 'eur',
      metadata: { booking_id: booking.id, purpose: 'deposit' },
      receipt_email: booking.email,
      automatic_payment_methods: { enabled: true },
    })

    return res.json({ clientSecret: pi.client_secret })
  } catch (e) {
    console.error('intent error', e)
    return res.status(500).json({ error: 'stripe error' })
  }
})

// (kept) Stripe Checkout flow if you still use it anywhere
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
      line_items:[{ quantity:1, price_data:{ currency:'eur', unit_amount: depositCents, product_data:{ name:`Dep_]()_
