import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import bookingsRouter from './routes/bookings.js'
import paymentsRouter from './routes/payments.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'
import { loadAll } from './store.mjs'

const app = express()
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '')

// Load persisted data (slots, shades, bookings) on boot
await loadAll()

// Middleware
app.use(cors({ origin: FRONTEND_URL || '*', credentials: false }))
app.use(morgan('tiny'))

// Stripe webhook must read the raw body *before* JSON middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

// Routes
app.use('/api/bookings', bookingsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)

// Health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'))

// Convenience redirect so hitting backend /admin goes to frontend /admin
app.get('/admin', (_req, res) => {
  if (!FRONTEND_URL) return res.status(500).send('FRONTEND_URL not set')
  res.redirect(302, `${FRONTEND_URL}/admin`)
})

// 404 + error handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

// Start
const PORT = process.env.PORT || 10000
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`))
