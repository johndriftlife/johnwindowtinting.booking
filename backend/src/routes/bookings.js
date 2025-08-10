// backend/src/routes/bookings.js
import express from 'express'
import { db, saveBookings } from '../store.mjs'
import { v4 as uuid } from 'uuid'
import { createCalendarEvent } from '../integrations/googleCalendar.mjs'

const router = express.Router()

// Prices (cents)
const PRICE_VALUES = {
  carbon: { front_doors: 4000, rear_doors: 4000, front_windshield: 8000, rear_windshield: 8000 },
  ceramic:{ front_doors: 6000, rear_doors: 6000, front_windshield:10000, rear_windshield:10000 }
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
function endFromStart(start) { return addHours(start, 2) }

// ---- availability ----
// (Keeps your existing rules, including Saturday next-hour block if you had it)
router.get('/availability', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const w = weekdayOf(date)
  const base = db.slots.filter(s => s.weekday === w)

  const bookedStarts = new Set(
    db.bookings
      .filter(b => b.date === date && b.status !== 'cancelled')
      .map(b => b.start_time)
  )

  // Saturday: block next hour after any booked start
  const alsoBlocked = new Set()
  if (w === 6) for (const start of bookedStarts) alsoBlocked.add(addHours(start, 1))

  const slots = base.map(s => {
    const start = s.start_time
    const enabled = !!s.enabled && !bookedStarts.has(start) && !alsoBlocked.has(start)
    return { start, end: endFromStart(start), enabled }
  })

  res.json({ date, slots })
})

// ---- create booking ---- (accept single or multiple shades)
router.post('/create', (req, res) => {
  const {
    full_name, phone, email, vehicle,
    tint_quality,
    tint_shade,          // optional single
    tint_shades,         // optional array
    windows, date, start_time, end_time
  } = req.body || {}

  const shadesArray =
    Array.isArray(tint_shades) ? tint_shades :
    (typeof tint_shade === 'string' && tint_shade.trim() ? [tint_shade.trim()] : [])

  if (
    !full_name || !phone || !email || !vehicle ||
    !tint_quality || !Array.isArray(windows) ||
    !date || !start_time || !end_time ||
    shadesArray.length === 0
  ) return res.status(400).json({ error: 'missing fields' })

  const w = weekdayOf(date)
  const slotDef = db.slots.find(s => s.weekday === w && s.start_time === start_time)
  if (!slotDef || !slotDef.enabled) return res.status(400).json({ error: 'time slot not available' })

  const conflict = db.bookings.find(
    b => b.date === date && b.start_time === start_time && b.status !== 'cancelled'
  )
  if (conflict) return res.status(409).json({ error: 'time already booked' })

  const values = PRICE_VALUES[tint_quality] || {}
  const total = windows.reduce((sum, wkey) => sum + (values[wkey] || 0), 0)
  const deposit = Math.floor(total * 0.5)

  const id = uuid()
  db.bookings.push({
    id,
    full_name, phone, email, vehicle,
    tint_quality,
    tint_shades_json: JSON.stringify(shadesArray),
    windows_json: JSON.stringify(windows),
    date, start_time, end_time,
    amount_total: total,
    amount_deposit: deposit,
    status: 'pending_payment',
    payment_intent_id: null,
    google_event_id: null
  })

  res.json({ booking_id: id, amount_total: total, amount_deposit: deposit })
})

// ---- finalize booking after deposit ----
// Creates the Google Calendar event on success
router.post('/finalize', async (req, res) => {
  const { booking_id, payment_intent_id } = req.body || {}
  const b = db.bookings.find(x => x.id === booking_id)
  if (!b) return res.status(404).json({ error: 'booking not found' })

  b.payment_intent_id = payment_intent_id
  b.status = 'deposit_paid'

  try {
    if (!b.google_event_id) {
      const eventId = await createCalendarEvent(b)
      b.google_event_id = eventId
    }
    await saveBookings()
    res.json({ ok: true, google_event_id: b.google_event_id })
  } catch (e) {
    console.error('Calendar error:', e?.message || e)
    await saveBookings()
    // Booking still succeeds even if calendar insert fails
    res.status(200).json({ ok: true, calendar_warning: e?.message || 'calendar failed' })
  }
})

export default router
