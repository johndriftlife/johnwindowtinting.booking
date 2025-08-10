import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Stripe from 'stripe';

import { initDb } from './store/db.js';
import bookingsRouter from './routes/bookings.js';
import paymentsRouter from './routes/payments.js';
import adminRouter from './routes/admin.js';

const app = express();
const port = process.env.PORT || 8080;

const allowedOrigin = process.env.FRONTEND_URL || '*';

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());

// Initialize DB
initDb();

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Routes
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
