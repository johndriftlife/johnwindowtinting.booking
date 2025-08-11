// backend/src/routes/payments.js
import express from 'express'
import Stripe from 'stripe'
import { v4 as uuidv4 } from 'uuid'
import { db, saveBookings } from '../store.mjs' // change to '../store.js' if your store file is .js

// ---------- config ----------
const stripeSecret = process.env.STRIPE_SECRET_KEY // sk_test_... or sk_live_...
if (!stripeSecret) console.warn('[payments] STRIPE_SECRET_KEY missing')
const stripe = stripeSecret ? new Stripe(stripeSecret) : null

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET // whsec_...
const ORIGIN =
  process.env.PUBLIC_BASE_URL || // e.g. https://johnwindowtinting-bookings.onrender.com
  process.env.FRONTEND_URL     || // optional
  'http://localhost:5173'

// ---------- pricing (in cents) ----------
const PRICE_VALUES = {
  carbon:  { front_doors: 4000, rear_doors: 4000, front_windshield: 8000,  rear_windshield: 8000 },
  ceramic: { front_doors: 6000, rear_doors: 6000, front_windshield: 10000, rear_windshield: 10000 }
}

// ---------- Google Calendar (safe wrappers) ----------
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

// ---------- helpers ----------
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
  // optional: shades, email, etc.
  return errors
}

// ---------- router ----------
const router = express.Router()

// Create a Stripe Checkout Session for 50% deposit (booking created after payment)
router.post('/checkout', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured on server' })

    const draft = req.body || {}
    const errors = validateDraft(draft)
    if (errors.length) return res.status(400).json({ error: errors.join(', ') })

    // Recompute amounts server-side
    const { amount_total, amount_deposit } = computeAmounts({
      tint_quality: draft.tint_quality || 'carbon',
      windows: draft.windows || []
    })
    if (amount_deposit <= 0) {
      return res.status(400).json({ error: 'Deposit amount is zero. Select at least one service.' })
    }

    // Keep metadata small (Stripe limit ~500 chars)
    const meta = {
      full_name: draft.full_name || '',
      phone: draft.phone || '',
      email: draft.email || '',
      vehicle: draft.vehicle || '',
      tint_quality: draft.tint_quality || 'carbon',
      // Store shades as CSV to keep metadata short
      tint_shades: Array.isArray(draft.tint_shades) ? draft.tint_shades.join(',') : (draft.tint_shade || ''),
      windows: (draft.windows || []).join(','),

      date: draft.date,
      start_time: draft.start_time,
      end_time: draft.end_time || draft.start_time,

      // Allow verifying post-payment
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
      // After paying, send the user back to your site
      success_url: `${ORIGIN}/?paid=1`,
      cancel_url: `${ORIGIN}/?canceled=1`,
      metadata: meta
    })

    return res.json({ url: session.url })
  } catch (err) {
    console.error('checkout error:', err?.message || err)
    return res.status(500).json({ error: err?.message || 'Failed to create checkout session' })
  }
})

// Stripe webhook: finalize booking after payment success
// IMPORTANT: this route must receive the raw body, see server.js:
// app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !WEBHOOK_SECRET) {
    console.error('Webhook called but Stripe/webhook secret not configured')
    return res.status(200).send('skipped')
  }

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

      // Pull booking draft from metadata
      const m = session.metadata || {}
      const windows = (m.windows ? String(m.windows).split(',').filter(Boolean) : [])
      const shadesArr = (m.tint_shades ? String(m.tint_shades).split(',').filter(Boolean) : [])

      // Recompute amounts again to be safe
      const { amount_total, amount_deposit } = computeAmounts({
        tint_quality: m.tint_quality || 'carbon',
        windows
      })

      // Build and persist the booking (now paid/confirmed)
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

      // Add to Google Calendar (non-blocking)
      calendarCreateSafe(booking).then(async ev => {
        if (ev?.id) {
          booking.calendar_event_id = ev.id
          booking.calendar_link = ev.htmlLink
          await saveBookings()
        }
      }).catch(() => {})

      console.log('Booking finalized via Checkout:', booking.id)
    }

    // Always acknowledge promptly
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err?.message || err)
    res.status(500).send('webhook failure')
  }
})

export default router
