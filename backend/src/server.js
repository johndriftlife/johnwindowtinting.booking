// backend/src/server.js
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

// ROUTES
import paymentsRouter from './routes/payments.js'
import bookingsRouter from './routes/bookings.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'

// PERSISTENCE (pick the extension that matches your repo)
import { loadAll } from './store.mjs' // <-- if your file is store.js, change to './store.js'

dotenv.config()

const app = express()

/**
 * IMPORTANT: Stripe webhook must see the raw body.
 * Our payments router defines `express.raw({ type: 'application/json' })` on `/webhook`,
 * so we mount the entire /api/payments router BEFORE express.json().
 */
app.use('/api/payments', paymentsRouter)

// Standard middleware (after webhook)
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

// Load data from disk (bookings, slots, settings, etc.)
await loadAll()

// API routes
app.use('/api/bookings', bookingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)

// Simple health check
app.get('/healthz', (_req, res) => res.json({ ok: true }))

// Start server
const port = process.env.PORT || 10000
app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
