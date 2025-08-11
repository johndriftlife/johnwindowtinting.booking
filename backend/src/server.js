// backend/src/server.js
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import paymentsRouter from './routes/payments.js'
import bookingsRouter from './routes/bookings.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'
import devRouter from './routes/dev.js'   // add this near the top with other imports

// ... after app is created and middleware set up:
app.use('/api/dev', devRouter)            // add this


import { loadAll } from './store.mjs' // <-- change to './store.js' if your file is .js

dotenv.config()
const app = express()

// Stripe webhook needs raw body -> payments router FIRST
app.use('/api/payments', paymentsRouter)

// Standard middleware AFTER webhook
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

// Load persisted data (bookings, settings, shades, etc.)
await loadAll()

// API routes
app.use('/api/bookings', bookingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }))

const port = process.env.PORT || 10000
app.listen(port, () => console.log(`API listening on port ${port}`))
