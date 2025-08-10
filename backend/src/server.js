import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import { initDb } from './store/db.js'
import bookingsRouter from './routes/bookings.js'
import paymentsRouter from './routes/payments.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'

// Redirect backend /admin to the frontend /admin
app.get('/admin', (req, res) => {
  const to = (process.env.FRONTEND_URL || '').replace(/\/+$/, '') + '/admin';
  if (!to) return res.status(500).send('FRONTEND_URL not set');
  res.redirect(302, to);
});

const app = express()
const port = process.env.PORT || 8080
const allowedOrigin = process.env.FRONTEND_URL || '*'

app.use(helmet())
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json())

initDb()

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }))

app.use('/api/bookings', bookingsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)

app.listen(port, () => console.log(`Backend listening on ${port}`))
