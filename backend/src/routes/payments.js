// backend/src/routes/payments.js
import express from 'express'
import Stripe from 'stripe'
import dotenv from 'dotenv'
import { db, saveBookings } from '../store.mjs' // <-- change to '../store.js' if your file is .js

dotenv.config()

const router = express.Router()
const stripeKey = process.env.STRIPE_SECRET_KEY || ''
const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

// ---------- helpers ----------
function getFrontendBase(req) {
  return process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || req.headers.origin || ''
}
function findBooking(booking_id) {
  return db.bookings.find(x => x.id === booking_id)
}
function getBookingId(req) {
  // support POST (body) and GET (query)
  return (req.body && req.body.booking_id) || req.query.booking_id || req.query.b
}

// Lazy/defensive Google Calendar import so the app always boots
async function createCalendarEventSafe(booking) {
  if (process.env.DISABLE_CALENDAR === 'true') return null
  try {
    // if you created googleCalendar.js instead, change the path below
    const mod = await import('../services/googleCalendar.mjs')
    if (!mod?.createCalendarEvent) return null
    return await mod.createCalendarEvent(booking)
  } catch (e) {
    console.error('Calendar module not available:', e?.message || e)
    return null
  }
}

async function finalizePaid(booking, payment_intent_id) {
  booking.payment_status = 'paid'
  booking.payment_intent_id = payment_intent_id
  booking.status = 'deposit_paid'
  try {
    if (!booking.calendar_event_id) {
      const ev = await createCalendarEventSafe(booking)
      if (ev?.id) {
        booking.calendar_event_id = ev.id
        booking.calendar_link = ev.htmlLink
      }
    }
  } catch (err) {
    console.error('Calendar create failed:', err?.message || err)
  }
  await saveBookings()
}

// ---------- WEBHOOK FIRST (raw body) ----------
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
        const b = booking_id && findBooking(booking_id)
        if (b) {
          const payment_intent_id = cs.payment_intent || cs.id
          await finalizePaid(b, payment_intent_id)
          console.log('Booking finalized via Checkout:', booking_id)
        }
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const booking_id = pi.metadata?.booking_id
        const b = booking_id && findBooking(booking_id)
        if (b) {
          await finalizePaid(b, pi.id)
          console.log('Booking finalized via PI:', booking_id)
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

// ---------- Enable JSON for normal routes AFTER webhook ----------
router.use(express.json())

// ---------- RECOMMENDED: Stripe Checkout ----------
async function handleCheckout(req, res) {
  try {
    if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })

    const booking_id = getBookingId(req)
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' })

    const b = findBooking(booking_id)
    if (!b) return res.status(404).json({ error: 'booking not found' })

    const amountCents = Number(b.amount_deposit || 0)
    if (!amountCents || amountCents < 50) {
      return res.status(400).json({ error: 'deposit amount invalid' })
    }

    const base = getFrontendBase(req)
    if (!base) return res.status(500).json({ error: 'Set FRONTEND_URL (or PUBLIC_FRONTEND_URL) in env' })

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
}
router.post('/checkout', handleCheckout)
router.get('/checkout', handleCheckout) // GET compatibility & manual testing

// ---------- COMPAT: create-payment-intent for old code ----------
async function handleCreatePI(req, res) {
  try {
    if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })

    const booking_id = getBookingId(req)
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' })

    const b = findBooking(booking_id)
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
}
router.post('/create-payment-intent', handleCreatePI)
router.get('/create-payment-intent', handleCreatePI) // GET compatibility

export default router
