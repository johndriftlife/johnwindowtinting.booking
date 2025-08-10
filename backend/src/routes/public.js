// backend/src/routes/public.js
import express from 'express'
import { db } from '../store.mjs'

const router = express.Router()

// Public endpoint: expose currently available shades by quality
router.get('/shades', (_req, res) => {
  res.json({
    carbon: db.shades.carbon,
    ceramic: db.shades.ceramic,
  })
})

export default router
