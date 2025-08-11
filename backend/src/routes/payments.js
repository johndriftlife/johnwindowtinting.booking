// backend/src/routes/payments.js
import express from 'express'
import Stripe from 'stripe'
import { v4 as uuidv4 } from 'uuid'
import { db, saveBookings } from '../store.mjs' // change to '../store.js' if needed

const stripeSecret = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecret ? new Stripe(stripeSecret) : null

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const ORIGIN =
  process.env.PUBLIC_BASE_URL ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'

// prices (in cents)
const PRICE_VALUES = {
  carbon:  { front_doors: 4000, rear_doors: 4000, front_windshield: 8000,  rear_windshield: 8000 },
  ceramic: { front_doors: 6000, rear_doors: 6000, front_windshield: 10000, rear_windshield: 10000 }
}

// calendar (safe, optional)
async function calendarCreateSafe(booking) {
  try {
    if (process.env.DISABLE_CALENDAR === 'true') return null
    const mod = await import('../services/googleCalendar.mjs').catch(async () => await import('../services/googleCalendar.js'))
    const fn = mod?.createCalendarEvent || mod?.addBookingToCalendar
    if (!fn) return null
    return await fn(booking)
  } catch (e) {
    console.error('Calendar create failed:', e?.message || e)
    return null
  }
}

function computeAmounts({ tint_quality = 'carbon', windows = [] }) {
  const map = PRICE_VALUES[tint_quality] || PRICE_VALUES.carbon
  const amount_total = (windows || []).reduce((sum, key) => sum + (map[key] || 0), 0)
  const amount_deposit = Math.floor(amount_total * 0.5)
  return { amount_total, amount_deposit }
}

function validateDraft(d) {
  const errors = []
  if (!d) errors.push('missing body')
  if (!d?.date) errors.push('date required')
  if (!d?.start_time) errors.push('start_time required')
  if (!Array.isArray(d?.windows) || d.windows.length === 0) errors.push('at least one window is required')
  return errors
}

const router = express.Router()

// Core session creation shared by both endpoints
async function createCheckoutSessionFromDraft(draft) {
  if (!stripe) throw new Error('Stripe not configured on server')

  const { amount_total, amount_deposit } = computeAmounts({
    tint_quality: draft.tint_quality || 'carbon',
    windows: draft.windows || []
  })
  if (amount_deposit <= 0) throw new Error('Deposit amount is zero. Select at least one service.')

  const meta = {
    full_name: draft.full_name || '',
    phone: draft.phone || '',
    email: draft.email || '',
    vehicle: draft.vehicle || '',
    tint_quality: draft.tint_quality || 'carbon',
    tint_shades: Array.isArray(draft.tint_shades) ? draft.tint_shades.join(',') : (draft.tint_shade || ''),
    windows: (draft.windows || []).join(','),
    date: draft.date,
    start_time: draft.start_time,
    end_time: draft.end_time || draft.start_time,
    amount_total: String(amount_total),
    amount_deposit: String(amount_deposit),
  }

  const productName = `Window Tinting Deposit (50%) — ${meta.date} ${meta.start_time}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: productName },
        unit_amount: amount_deposit
      },
      quantity: 1
    }],
    success_url: `${ORIGIN}/?paid=1`,
    cancel_url: `${ORIGIN}/?canceled=1`,
    metadata: meta
  })

  return session
}

// New/official endpoint
router.post('/checkout', async (req, res) => {
  try {
    const draft = req.body || {}
    const errors = validateDraft(draft)
    if (errors.length) return res.status(400).json({ error: errors.join(', ') })
    const session = await createCheckoutSessionFromDraft(draft)
    return res.json({ url: session.url })
  } catch (err) {
    console.error('checkout error:', err?.message || err)
    return res.status(500).json({ error: err?.message || 'Failed to create checkout session' })
  }
})

// ✅ Alias to keep older frontend calls working
router.post('/create-payment-intent', async (req, res) => {
  try {
    const draft = req.body || {}
    const errors = validateDraft(draft)
    if (errors.length) return res.status(400).json({ error: errors.join(', ') })
    const session = await createCheckoutSessionFromDraft(draft)
    return res.json({ url: session.url })
  } catch (err) {
    console.error('create-payment-intent alias error:', err?.message || err)
    return res.status(500).json({ error: err?.message || 'Failed to create checkout session' })
  }
})

// Webhook to finalize booking after successful payment
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !WEBHOOK_SECRET) return res.status(200).send('skipped')

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verify failed:', err?.message || err)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const m = session.metadata || {}
      const windows = (m.windows ? String(m.windows).split(',').filter(Boolean) : [])
      const shadesArr = (m.tint_shades ? String(m.tint_shades).split(',').filter(Boolean) : [])
      const { amount_total, amount_deposit } = computeAmounts({ tint_quality: m.tint_quality || 'carbon', windows })

      const booking = {
        id: uuidv4(),
        created_at: new Date().toISOString(),
        status: 'confirmed',
        payment_status: 'paid',
        date: m.date,
        start_time: m.start_time,
        end_time: m.end_time || m.start_time,
        full_name: m.full_name || '',
        phone: m.phone || '',
        email: m.email || '',
        vehicle: m.vehicle || '',
        tint_quality: m.tint_quality || 'carbon',
        tint_shade: shadesArr.length === 1 ? shadesArr[0] : undefined,
        tint_shades: shadesArr.length > 1 ? shadesArr : undefined,
        windows,
        amount_total,
        amount_deposit,
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent || null
      }

      db.bookings = db.bookings || []
      db.bookings.push(booking)
      await saveBookings()

      calendarCreateSafe(booking).then(async ev => {
        if (ev?.id) {
          booking.calendar_event_id = ev.id
          booking.calendar_link = ev.htmlLink
          await saveBookings()
        }
      }).catch(() => {})

      console.log('Booking finalized via Checkout:', booking.id)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err?.message || err)
    res.status(500).send('webhook failure')
  }
})

export default router
