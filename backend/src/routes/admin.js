// backend/src/routes/admin.js
import { Router } from 'express'
import { db } from '../store.mjs'

const router = Router()

router.post('/shades', (req, res) => {
  const { quality, shade, available } = req.body || {}
  if (!quality || !shade || typeof available !== 'boolean') {
    return res.status(400).json({ error: 'quality, shade, available required' })
  }
  const list = db.admin.shades[quality]
  if (!list) return res.status(404).json({ error: 'quality not found' })
  const item = list.find(x => x.shade === shade)
  if (!item) return res.status(404).json({ error: 'shade not found' })
  item.available = available
  res.json({ ok: true, shades: db.admin.shades })
})

router.post('/slots', (req, res) => {
  const { date, slots } = req.body || {}
  if (!date || !Array.isArray(slots)) {
    return res.status(400).json({ error: 'date and slots[] required' })
  }
  db.admin.slotToggles[date] = slots.map(s => ({
    start: s.start,
    end: s.end || '',
    enabled: !!s.enabled
  }))
  res.json({ ok: true })
})

export default router
