import { Router } from 'express'
import Stripe from 'stripe'
import { addBooking } from '../store.mjs'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' })

router.get('/payment-test-intent', async (_req, res) => {
  try {
    const booking = addBooking({
      full_name:'Test User', phone:'+1 555-000-0000', email:'test@example.com',
      vehicle:'Test', tint_quality:'carbon', tint_shades:['35%'],
      windows:['front_doors'], date:'2099-01-01', start_time:'10:00', end_time:'',
      amount_total: 4000, amount_deposit: 2000
    })
    const pi = await stripe.paymentIntents.create({
      amount: booking.amount_deposit, currency:'eur',
      metadata:{ booking_id: booking.id, purpose:'deposit' },
      automatic_payment_methods:{ enabled:true }
    })
    res.json({ ok:true, booking_id: booking.id, clientSecret: pi.client_secret })
  } catch (e) { res.status(500).json({ ok:false, error: e?.message || 'stripe error' }) }
})

export default router
