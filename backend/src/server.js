// backend/src/server.js  (snippet)
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import paymentsRouter from './routes/payments.js'
import bookingsRouter from './routes/bookings.js'
import adminRouter from './routes/admin.js'
import publicRouter from './routes/public.js'
import { loadAll } from './store.mjs'

const app = express()

// Stripe webhook must be raw:
app.use('/api/payments/webhook', paymentsRouter) // payments router defines raw on /webhook

// Then regular middlewares:
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

await loadAll()

app.use('/api/bookings', bookingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)

app.get('/healthz', (_req,res)=>res.json({ok:true}))

const port = process.env.PORT || 10000
app.listen(port, ()=> console.log('API listening on', port))
