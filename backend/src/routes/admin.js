import { Router } from 'express';
import { getDb } from '../store/db.js';
import Stripe from 'stripe';

const router = Router();

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (token && token === process.env.ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

router.get('/bookings', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM bookings ORDER BY date ASC, start_time ASC').all();
  res.json(rows);
});

router.post('/cancel', requireAdmin, (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'Missing booking_id' });
  const db = getDb();
  db.prepare('UPDATE bookings SET status="cancelled" WHERE id=?').run(booking_id);
  res.json({ ok: true });
});

router.post('/refund', requireAdmin, async (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'Missing booking_id' });
  const db = getDb();
  const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(booking_id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  if (!b.payment_intent_id) return res.status(400).json({ error: 'No payment to refund' });
  if (b.status === 'deposit_refunded') return res.status(400).json({ error: 'Already refunded' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
    await stripe.refunds.create({ payment_intent: b.payment_intent_id, amount: b.amount_deposit });
    db.prepare('UPDATE bookings SET status="deposit_refunded" WHERE id=?').run(booking_id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Stripe refund failed', details: e.message });
  }
});

router.get('/shades', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT quality, shade, available FROM shade_availability ORDER BY quality, shade').all();
  res.json(rows);
});

router.post('/toggle-shade', requireAdmin, (req, res) => {
  const { quality, shade, available } = req.body;
  if (!quality || !shade || typeof available !== 'number') return res.status(400).json({ error: 'Invalid params' });
  const db = getDb();
  db.prepare('INSERT INTO shade_availability (quality, shade, available) VALUES (?,?,?) ON CONFLICT(quality,shade) DO UPDATE SET available=excluded.available')
    .run(quality, shade, available);
  res.json({ ok: true });
});

router.get('/slots', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT weekday, start_time, enabled FROM slot_toggles ORDER BY weekday, start_time').all();
  res.json(rows);
});

router.post('/toggle-slot', requireAdmin, (req, res) => {
  const { weekday, start_time, enabled } = req.body;
  if (weekday == null || !start_time || typeof enabled !== 'number') return res.status(400).json({ error: 'Invalid params' });
  const db = getDb();
  db.prepare('INSERT INTO slot_toggles (weekday, start_time, enabled) VALUES (?,?,?) ON CONFLICT(weekday,start_time) DO UPDATE SET enabled=excluded.enabled')
    .run(weekday, start_time, enabled);
  res.json({ ok: true });
});

export default router;
