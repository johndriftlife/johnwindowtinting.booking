// backend/src/server.js
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

// Load env
dotenv.config()

// Routers
import paymentsRouter from './routes/payments.js'
import bookingsRouter from './routes/bookings.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'
// Optional dev router (safe to keep; remove import + use line if you don't need it)
import devRouter from './routes/dev.js'

const app = express()

// CORS + logs
app.use(cors())
app.use(morgan('dev'))

// ⚠️ Stripe webhook MUST use raw body & come BEFORE express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter)

// JSON parser for everything else
app.use(express.json())

// Mount routers (order doesn’t matter after this point)
app.use('/api/bookings', bookingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)
app.use('/api/payments', paymentsRouter)

// Dev router (for calendar-ping etc.)
app.use('/api/dev', devRouter)

// Tiny health check (helps avoid 404 spam on HEAD /)
app.get('/', (_req, res) => res.status(200).send('API OK'))
app.head('/', (_req, res) => res.status(200).end())

// Start server
const port = process.env.PORT || 10000
app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
