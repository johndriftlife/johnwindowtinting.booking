// backend/src/routes/dev.js
import { Router } from 'express'
import Stripe from 'stripe'
import { addBooking } from '../store.mjs'
import { createCalendarEventSafe } from '../services/googleCalendar.mjs'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

// Existing ping (kept)
router.get('/calendar-ping', async (_req, res) => {
  try {
    await createCalendarEventSafe({
      full_name:'Ping', email:'ping@example.com', date:'2099-01-01',
      start_time:'10:00', end_time:'', vehicle:'Test',
      tint_quality:'carbon', tint_shades:['50%'], windows:['front_doors']
    })
    res.json({ ok:true })
  } catch (e) { res.status(500).json({ error:String(e) }) }
})

// NEW: simple Stripe check you can open in your browser
router.get('/payment-test-intent', async (_req, res) => {
  try {
    // 1) create a fake booking in memory
    const booking = addBooking({
      full_name:'Test User', phone:'+1 555-000-0000', email:'test@example.com',
      vehicle:'Test Vehicle', tint_quality:'carbon', tint_shades:['35%'],
      windows:['front_doors'], date:'2099-01-01', start_time:'10:00', end_time:'',
      amount_total: 4000, amount_deposit: 2000
    })

    // 2) create a PaymentIntent for the deposit
    const pi = await stripe.paymentIntents.create({
      amount: booking.amount_deposit,
      currency: 'eur',
      metadata: { booking_id: booking.id, purpose: 'deposit' },
      receipt_email: booking.email,
      automatic_payment_methods: { enabled: true }
    })

    // 3) if you see clientSecret below in your browser, Stripe is OK
    res.json({ ok:true, booking_id: booking.id, clientSecret: pi.client_secret })
  } catch (e) {
    console.error('payment-test-intent error', e)
    res.status(500).json({ ok:false, error: e?.message || 'stripe error' })
  }
})

export default router
