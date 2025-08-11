// backend/src/routes/bookings.js
import { Router } from 'express'
import { db, addBooking, defaultSlotsFor, getBookingsForDate } from '../store.js'
const router = Router()

router.get('/availability', (req, res) => {
  const date = req.query.date
  if (!date) return res.status(400).json({ error: 'date required' })
  let slots = defaultSlotsFor(date).map(s => ({ ...s, enabled:true }))
  if (db.admin.slotToggles[date]) { slots = db.admin.slotToggles[date].map(o => ({ start:o.start, end:o.end || '', enabled:!!o.enabled })) }
  const booked = getBookingsForDate(date).filter(b => b.status !== 'cancelled')
  const bookedStarts = new Set(booked.map(b => b.start_time))
  const d = new Date(date + 'T00:00:00'); const wd = d.getUTCDay()
  const out = slots.map(s => ({ ...s, enabled: s.enabled && !bookedStarts.has(s.start) }))
  if (wd === 6) {
    const addDisabled = new Set()
    for (const b of booked) {
      const [hh, mm] = b.start_time.split(':').map(n=>parseInt(n,10))
      const next = String(hh+1).padStart(2,'0') + ':' + (mm?String(mm).padStart(2,'0'):'00')
      addDisabled.add(next)
    }
    for (const s of out) { if (addDisabled.has(s.start)) s.enabled = false }
  }
  res.json({ date, slots: out })
})

router.post('/create', (req, res) => {
  const { full_name, phone, email, vehicle, tint_quality, tint_shades, windows, date, start_time, end_time, amount_total, amount_deposit } = req.body || {}
  if (!full_name || !phone || !email || !vehicle) return res.status(400).json({ error: 'Missing contact fields' })
  if (!date || !start_time) return res.status(400).json({ error: 'Missing date/time' })
  if (!Array.isArray(windows) || windows.length === 0) return res.status(400).json({ error: 'No windows selected' })
  const rec = addBooking({
    full_name, phone, email, vehicle,
    tint_quality, tint_shades: Array.isArray(tint_shades)?tint_shades:[],
    windows, date, start_time, end_time: end_time || '',
    amount_total: +amount_total || 0, amount_deposit: +amount_deposit || 0
  })
  res.json({ ok:true, booking_id: rec.id })
})
export default router
