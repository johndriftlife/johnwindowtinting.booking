// backend/src/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

// Routers (make sure these files exist)
import bookingsRouter from './routes/bookings.js'
import paymentsRouter from './routes/payments.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'

const app = express()

/**
 * CORS
 * Allow your frontend domain; fall back to '*'
 */
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '')
app.use(
  cors({
    origin: FRONTEND_URL || '*',
    credentials: false,
  })
)

// Logging
app.use(morgan('tiny'))

/**
 * Stripe webhook needs the raw body.
 * This MUST come before express.json().
 */
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))

// JSON for everything else
app.use(express.json())

/**
 * Routes
 */
app.use('/api/bookings', bookingsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)

// Simple health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'))

/**
 * Redirect backend /admin to the frontend /admin page,
 * so https://<backend>/admin works.
 * Set FRONTEND_URL env var to your frontend, e.g.
 * FRONTEND_URL=https://tinting-bookings.onrender.com
 */
app.get('/admin', (req, res) => {
  if (!FRONTEND_URL) {
    return res
      .status(500)
      .send('FRONTEND_URL not set on backend (needed for /admin redirect)')
  }
  return res.redirect(302, `${FRONTEND_URL}/admin`)
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

// Start
const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`)
})
