// backend/src/routes/bookings.js
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, saveBookings } from '../store.mjs' // <-- change to '../store.js' if that's your file

const router = express.Router()

// ---- PRICES (cents) ----
const PRICE_VALUES = {
  carbon:   { front_doors: 4000, rear_doors: 4000, front_windshield: 8000,  rear_windshield: 8000 },
  ceramic:  { front_doors: 6000, rear_doors: 6000, front_windshield: 10000, rear_windshield: 10000 }
}

// ---- Safe, lazy calendar call so the server always boots ----
async function createCalendarEventSafe(booking) {
  if (process.env.DISABLE_CALENDAR === 'true') return null
  try {
    // Use .mjs or .js to match your file name
    const mod = await import('../services/googleCalendar.mjs').catch(async () => await import('../services/googleCalendar.js'))
    if (!mod?.createCalendarEvent && !mod?.addBookingToCalendar) return null
    // support either exported name
    const fn = mod.createCalendarEvent || mod.addBookingToCalendar
    return await fn(booking)
  } catch (e) {
    console.error('Calendar module not available:', e?.message || e)
    return null
  }
}

// ---- Helper: compute totals from windows & tint quality ----
function computeAmounts({ tint_quality = 'carbon', windows = [] }) {
  const map = PRICE_VALUES[tint_quality] || PRICE_VALUES.carbon
  const amount_total = windows.reduce((sum, key) => sum + (map[key] || 0), 0)
  const amount_deposit = Math.floor(amount_total * 0.5) // 50% deposit
  return { amount_total, amount_deposit }
}

// ---- GET /availability?date=YYYY-MM-DD (kept simple; uses your stored settings/overrides if present) ----
router.get('/availability', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required as YYYY-MM-DD' })

  // If you persist per-date slot overrides, serve them:
  const override = db.slot_overrides?.[date]
  if (override?.slots) {
    return res.json({ date, slots: override.slots })
  }

  // Fall back to your generated defaults already in memory (if you keep them)
  if (db.default_slots_generator) {
    const slots = db.default_slots_generator(date)
    return res.json({ date, slots })
  }

  // Minimal default in case nothing else is present (Tue–Fri 14:00; Sat hourly 09–14; Sun 10:00; Mon none)
  const d = new Date(date + 'T00:00:00')
  const weekday = ((d.getUTCDay() + 6) % 7) + 1 // 1=Mon..7=Sun
  let slots = []
  if (weekday >= 2 && weekday <= 5) { // Tue-Fri
    slots = [{ start: '14:00', end: '16:00', enabled: true }]
  } else if (weekday === 6) { // Sat
    slots = ['09:00','10:00','11:00','12:00','13:00','14:00'].map(s => ({ start: s, end: s, enabled: true }))
  } else if (weekday === 7) { // Sun
    slots = [{ start: '10:00', end: '12:00', enabled: true }]
  }
  return res.json({ date, slots })
})

// ---- POST /create  -> creates booking, saves, and AUTO-ADDS to Google Calendar ----
router.post('/create', async (req, res) => {
  try {
    const {
      full_name = '',
      phone = '',
      email = '',
      vehicle = '',
      tint_quality = 'carbon',
      tint_shade,              // string (mobile) OR
      tint_shades,             // array (desktop multi-select)
      windows = [],
      date,
      start_time,
      end_time
    } = req.body || {}

    if (!date) return res.status(400).json({ error: 'date required' })
    if (!start_time) return res.status(400).json({ error: 'start_time required' })
    if (!windows || !Array.isArray(windows) || windows.length === 0) {
      return res.status(400).json({ error: 'at least one window is required' })
    }

    // Normalize shade(s)
    let shades = []
    if (Array.isArray(tint_shades)) shades = tint_shades
    else if (tint_shade) shades = [tint_shade]

    // Compute money
    const { amount_total, amount_deposit } = computeAmounts({ tint_quality, windows })

    const booking = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      status: 'pending',
      payment_status: 'unpaid',
      date,
      start_time,
      end_time: end_time || start_time, // your UI often uses single time; keep same if missing
      full_name,
      phone,
      email,
      vehicle,
      tint_quality,
      tint_shade: shades.length === 1 ? shades[0] : undefined,
      tint_shades: shades.length > 1 ? shades : undefined,
      windows,
      amount_total,
      amount_deposit
    }

    // Persist
    db.bookings = db.bookings || []
    db.bookings.push(booking)
    await saveBookings()

    // Fire-and-forget calendar creation (don’t block the response if it fails)
    createCalendarEventSafe(booking)
      .then(ev => {
        if (ev?.id) {
          booking.calendar_event_id = ev.id
          booking.calendar_link = ev.htmlLink
          return saveBookings()
        }
      })
      .catch(() => {})

    // Return to client
    res.json({
      id: booking.id,
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      amount_total: booking.amount_total,
      amount_deposit: booking.amount_deposit,
      status: booking.status,
      payment_status: booking.payment_status
    })
  } catch (e) {
    console.error('Create booking error:', e?.message || e)
    res.status(500).json({ error: 'failed to create booking' })
  }
})

export default router
