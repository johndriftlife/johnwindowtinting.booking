import express from 'express'
import Stripe from 'stripe'
import { db, saveShades, saveSlots } from '../store.mjs'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

// --- simple bearer auth using ADMIN_PASSWORD env ---
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  next()
}
router.use(requireAdmin)

// --- bookings ---
router.get('/bookings', (_req, res) => {
  res.json(db.bookings)
})

router.post('/cancel', (req, res) => {
  const { booking_id } = req.body || {}
  const b = db.bookings.find(x => x.id === booking_id)
  if (!b) return res.status(404).json({ error: 'not found' })
  b.status = 'cancelled'
  res.json({ ok: true })
})

router.post('/refund', async (req, res) => {
  try {
    const { booking_id } = req.body || {}
    const b = db.bookings.find(x => x.id === booking_id)
    if (!b) return res.status(404).json({ error: 'not found' })
    if (!b.payment_intent_id) return res.status(400).json({ error: 'no payment intent' })

    await stripe.refunds.create({ payment_intent: b.payment_intent_id })
    b.status = 'refunded'
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// --- shades (availability toggles) ---
router.get('/shades', (_req, res) => {
  const list = [
    ...db.shades.carbon.map(s => ({ quality: 'carbon', shade: s.shade, available: s.available })),
    ...db.shades.ceramic.map(s => ({ quality: 'ceramic', shade: s.shade, available: s.available })),
  ]
  res.json(list)
})

router.post('/toggle-shade', async (req, res) => {
  const { quality, shade, available } = req.body || {}
  const arr = db.shades[quality]
  if (!arr) return res.status(400).json({ error: 'invalid quality' })
  const it = arr.find(x => x.shade === shade)
  if (!it) return res.status(404).json({ error: 'not found' })
  it.available = !!available
  await saveShades() // persist to disk
  res.json({ ok: true })
})

// --- slots (day/time availability toggles) ---
router.get('/slots', (_req, res) => {
  res.json(db.slots)
})

router.post('/toggle-slot', async (req, res) => {
  const { weekday, start_time, enabled } = req.body || {}
  const it = db.slots.find(
    s => s.weekday === Number(weekday) && s.start_time === String(start_time)
  )
  if (!it) return res.status(404).json({ error: 'not found' })
  it.enabled = !!enabled
  await saveSlots() // persist to disk
  res.json({ ok: true })
})

export default router
