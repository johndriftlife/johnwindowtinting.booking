// backend/src/routes/bookings.js
import express from 'express'
import { db } from '../store.mjs'
import { v4 as uuid } from 'uuid'

const router = express.Router()

// Prices in cents
const PRICE_VALUES = {
  carbon: {
    front_doors: 4000,
    rear_doors: 4000,
    front_windshield: 8000,
    rear_windshield: 8000,
  },
  ceramic: {
    front_doors: 6000,
    rear_doors: 6000,
    front_windshield: 10000,
    rear_windshield: 10000,
  },
}

// ---- helpers ----
function weekdayOf(dateStr) {
  // 0=Sun ... 6=Sat
  const d = new Date(dateStr + 'T00:00:00')
  return d.getUTCDay()
}

function addHours(hhmm, hours) {
  const [h, m] = hhmm.split(':').map(Number)
  const base = new Date(Date.UTC(2000, 0, 1, h, m || 0))
  base.setUTCHours(base.getUTCHours() + hours)
  const hh = String(base.getUTCHours()).padStart(2, '0')
  const mm = String(base.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// Each booking visually spans 2 hours on the UI
function endFromStart(start) {
  return addHours(start, 2)
}

// ---- availability ----
// Returns ALL configured slots for the given date's weekday,
// with an `enabled` flag computed by:
//  - Admin toggle (db.slots[].enabled)
//  - Already-booked start times on that date
//  - SATURDAY SPECIAL: also disable the hour AFTER any booked start
router.get('/availability', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const w = weekdayOf(date)

  // base slots configured for that weekday (from persistent store)
  const base = db.slots.filter(s => s.weekday === w)

  // collect already-booked start times for the date (ignore cancelled)
  const bookedStarts = new Set(
    db.bookings
      .filter(b => b.date === date && b.status !== 'cancelled')
      .map(b => b.start_time)
  )

  // On Saturday (6), also block the following hour after any booked start
  const alsoBlocked = new Set()
  if (w === 6) {
    for (const start of bookedStarts) {
      alsoBlocked.add(addHours(start, 1))
    }
  }

  const slots = base.map(s => {
    const start = s.start_time
    const isBooked = bookedStarts.has(start)
    const saturdayFollowingBlocked = alsoBlocked.has(start)
    const enabled = !!s.enabled && !isBooked && !saturdayFollowingBlocked
    return { start, end: endFromStart(start), enabled }
  })

  res.json({ date, slots })
})

// ---- create booking ----
router.post('/create', (req, res) => {
  const {
    full_name,
    phone,
    email,
    vehicle,
    tint_quality,
    tint_shade,
    windows,   // array of keys (front_doors, rear_doors, front_windshield, rear_windshield)
    date,
    start_time,
    end_time,
  } = req.body || {}

  if (
    !full_name || !phone || !email || !vehicle ||
    !tint_quality || !tint_shade || !Array.isArray(windows) ||
    !date || !start_time || !end_time
  ) {
    return res.status(400).json({ error: 'missing fields' })
  }

  // validate that the slot exists and is enabled at the time of booking
  const w = weekdayOf(date)
  const slotDef = db.slots.find(s => s.weekday === w && s.start_time === start_time)
  if (!slotDef || !slotDef.enabled) {
    return res.status(400).json({ error: 'time slot not available' })
  }

  // prevent double booking on the same start_time
  const conflict = db.bookings.find(
    b => b.date === date && b.start_time === start_time && b.status !== 'cancelled'
  )
  if (conflict) {
    return res.status(409).json({ error: 'time already booked' })
  }

  const values = PRICE_VALUES[tint_quality] || {}
  const total = windows.reduce((sum, w) => sum + (values[w] || 0), 0)
  const deposit = Math.floor(total * 0.5)

  const id = uuid()
  db.bookings.push({
    id,
    full_name,
    phone,
    email,
    vehicle,
    tint_quality,
    tint_shade,
    windows_json: JSON.stringify(windows),
    date,
    start_time,
    end_time,
    amount_total: total,
    amount_deposit: deposit,
    status: 'pending_payment',
    payment_intent_id: null,
  })

  res.json({ booking_id: id, amount_total: total, amount_deposit: deposit })
})

// ---- finalize booking after Stripe deposit ----
router.post('/finalize', (req, res) => {
  const { booking_id, payment_intent_id } = req.body || {}
  const b = db.bookings.find(x => x.id === booking_id)
  if (!b) return res.status(404).json({ error: 'booking not found' })
  b.payment_intent_id = payment_intent_id
  b.status = 'deposit_paid'
  res.json({ ok: true })
})

export default router
