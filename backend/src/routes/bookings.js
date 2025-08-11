// backend/src/routes/bookings.js
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db, saveBookings } from '../store.mjs' // change to '../store.js' if needed

const router = express.Router()

// ---------- pricing (in cents) ----------
const PRICE_VALUES = {
  carbon:  { front_doors: 4000, rear_doors: 4000, front_windshield: 8000,  rear_windshield: 8000 },
  ceramic: { front_doors: 6000, rear_doors: 6000, front_windshield: 10000, rear_windshield: 10000 }
}

// ---------- calendar safe wrappers ----------
async function calendarCreateSafe(booking) {
  if (process.env.DISABLE_CALENDAR === 'true') return null
  try {
    const mod = await import('../services/googleCalendar.mjs').catch(async () => await import('../services/googleCalendar.js'))
    const fn = mod.createCalendarEvent || mod.addBookingToCalendar
    return fn ? await fn(booking) : null
  } catch (e) {
    console.error('Calendar create failed:', e?.message || e)
    return null
  }
}

async function calendarUpdateSafe(booking) {
  if (process.env.DISABLE_CALENDAR === 'true') return null
  try {
    const mod = await import('../services/googleCalendar.mjs').catch(async () => await import('../services/googleCalendar.js'))
    if (booking.calendar_event_id && mod.updateCalendarEvent) {
      return await mod.updateCalendarEvent(booking)
    }
    // If no event yet, create one now
    const creator = mod.createCalendarEvent || mod.addBookingToCalendar
    return creator ? await creator(booking) : null
  } catch (e) {
    console.error('Calendar update failed:', e?.message || e)
    return null
  }
}

async function calendarDeleteSafe(eventId) {
  if (process.env.DISABLE_CALENDAR === 'true') return null
  try {
    const mod = await import('../services/googleCalendar.mjs').catch(async () => await import('../services/googleCalendar.js'))
    if (mod.deleteCalendarEvent) {
      await mod.deleteCalendarEvent(eventId)
    }
  } catch (e) {
    console.error('Calendar delete failed:', e?.message || e)
  }
}

// ---------- helpers ----------
function computeAmounts({ tint_quality = 'carbon', windows = [] }) {
  const map = PRICE_VALUES[tint_quality] || PRICE_VALUES.carbon
  const amount_total = windows.reduce((sum, key) => sum + (map[key] || 0), 0)
  const amount_deposit = Math.floor(amount_total * 0.5)
  return { amount_total, amount_deposit }
}

function findBooking(id) {
  return (db.bookings || []).find(b => b.id === id)
}

// ---------- GET /availability ----------
router.get('/availability', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required as YYYY-MM-DD' })

  const override = db.slot_overrides?.[date]
  if (override?.slots) return res.json({ date, slots: override.slots })

  if (db.default_slots_generator) {
    const slots = db.default_slots_generator(date)
    return res.json({ date, slots })
  }

  // Minimal defaults (Tue–Fri 14:00; Sat 09–14 hourly; Sun 10:00; Mon none)
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

// ---------- POST /create ----------
router.post('/create', async (req, res) => {
  try {
    const {
      full_name = '',
      phone = '',
      email = '',
      vehicle = '',
      tint_quality = 'carbon',
      tint_shade,
      tint_shades,
      windows = [],
      date,
      start_time,
      end_time
    } = req.body || {}

    if (!date) return res.status(400).json({ error: 'date required' })
    if (!start_time) return res.status(400).json({ error: 'start_time required' })
    if (!Array.isArray(windows) || windows.length === 0) {
      return res.status(400).json({ error: 'at least one window is required' })
    }

    let shades = []
    if (Array.isArray(tint_shades)) shades = tint_shades
    else if (tint_shade) shades = [tint_shade]

    const { amount_total, amount_deposit } = computeAmounts({ tint_quality, windows })

    const booking = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      status: 'pending',
      payment_status: 'unpaid',
      date,
      start_time,
      end_time: end_time || start_time,
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

    db.bookings = db.bookings || []
    db.bookings.push(booking)
    await saveBookings()

    // async calendar create
    calendarCreateSafe(booking).then(async ev => {
      if (ev?.id) {
        booking.calendar_event_id = ev.id
        booking.calendar_link = ev.htmlLink
        await saveBookings()
      }
    }).catch(() => {})

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

// ---------- PUT /:id  (update booking + calendar) ----------
router.put('/:id', async (req, res) => {
  try {
    const b = findBooking(req.params.id)
    if (!b) return res.status(404).json({ error: 'booking not found' })

    // Allow updates on core fields (only if provided)
    const fields = [
      'full_name', 'phone', 'email', 'vehicle',
      'tint_quality', 'tint_shade', 'tint_shades',
      'windows', 'date', 'start_time', 'end_time', 'status'
    ]
    for (const f of fields) {
      if (typeof req.body[f] !== 'undefined') b[f] = req.body[f]
    }

    // Normalize shades
    if (Array.isArray(b.tint_shades) && b.tint_shades.length > 1) {
      b.tint_shade = undefined
    } else if (b.tint_shade) {
      b.tint_shades = undefined
    }

    // Recompute amounts if windows or tint_quality changed
    if (req.body.windows || req.body.tint_quality) {
      const { amount_total, amount_deposit } = computeAmounts({ tint_quality: b.tint_quality, windows: b.windows || [] })
      b.amount_total = amount_total
      b.amount_deposit = amount_deposit
    }

    await saveBookings()

    // Update (or create) calendar event
    const ev = await calendarUpdateSafe(b)
    if (ev?.id) {
      b.calendar_event_id = ev.id
      b.calendar_link = ev.htmlLink
      await saveBookings()
    }

    res.json({ ok: true, booking: b })
  } catch (e) {
    console.error('Update booking error:', e?.message || e)
    res.status(500).json({ error: 'failed to update booking' })
  }
})

// ---------- DELETE /:id  (cancel booking + delete calendar event) ----------
router.delete('/:id', async (req, res) => {
  try {
    const b = findBooking(req.params.id)
    if (!b) return res.status(404).json({ error: 'booking not found' })

    // mark cancelled
    b.status = 'cancelled'
    await saveBookings()

    if (b.calendar_event_id) {
      await calendarDeleteSafe(b.calendar_event_id)
      // keep the id for audit, or clear it if you prefer:
      // delete b.calendar_event_id
      await saveBookings()
    }

    res.json({ ok: true })
  } catch (e) {
    console.error('Cancel booking error:', e?.message || e)
    res.status(500).json({ error: 'failed to cancel booking' })
  }
})

// ---------- POST /:id/cancel  (alternate cancel endpoint) ----------
router.post('/:id/cancel', async (req, res) => {
  req.method = 'DELETE'
  return router.handle(req, res)
})

export default router
