// backend/src/server.js
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

dotenv.config()

import paymentsRouter, { webhookHandler } from './routes/payments.js'
import bookingsRouter from './routes/bookings.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'
import devRouter from './routes/dev.js'

const app = express()
app.use(cors())
app.use(morgan('dev'))

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookHandler)
app.use(express.json())

app.use('/api/bookings', bookingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/dev', devRouter)

app.get('/', (_req, res) => res.status(200).send('API OK'))
app.head('/', (_req, res) => res.status(200).end())

const port = process.env.PORT || 10000
app.listen(port, () => console.log(`API listening on port ${port}`))
