import { Router } from 'express';
import { getDb } from '../store/db.js';
import { HOURS, SLOT_MIN, SERVICES } from '../config/businessHours.js';
import { generateSlotsForDate, isOverlap } from '../utils/time.js';

const router = Router();

router.get('/availability', (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'Missing date' });

  const db = getDb();
  const weekday = new Date(date + 'T00:00:00').getDay();
  const blocks = HOURS[weekday] || [];

  // All potential slots
  const slots = generateSlotsForDate(date, blocks, SLOT_MIN);

  // Remove slots that overlap existing bookings on that date (not cancelled)
  const existing = db.prepare(
    `SELECT start_time, end_time FROM bookings WHERE date = ? AND status != 'cancelled'`
  ).all(date);

  const available = slots.filter(slot => {
    return !existing.some(b => isOverlap(slot.start, slot.end, b.start_time, b.end_time));
  });

  res.json({ date, slots: available });
});

// Create pending booking + payment intent (50% deposit)
router.post('/create', (req, res) => {
  const {
    full_name, phone, email, vehicle, service_type, date, start_time, end_time
  } = req.body;

  if (!['carbon', 'ceramic'].includes(service_type)) {
    return res.status(400).json({ error: 'Invalid service_type' });
  }

  const db = getDb();

  // Check overlap
  const conflict = db.prepare(
    `SELECT id FROM bookings 
     WHERE date=? AND status!='cancelled' 
     AND ((? < end_time) AND (start_time < ?))`
  ).get(date, start_time, end_time);

  if (conflict) {
    return res.status(409).json({ error: 'Time slot already booked' });
  }

  const total = SERVICES[service_type];
  const deposit = Math.floor(total * 0.5);

  const info = {
    full_name, phone, email, vehicle, service_type, date, start_time, end_time,
    status: 'pending_payment',
    payment_intent_id: null,
    amount_total: total,
    amount_deposit: deposit,
    created_at: new Date().toISOString()
  };

  const stmt = db.prepare(`
    INSERT INTO bookings 
    (full_name, phone, email, vehicle, service_type, date, start_time, end_time, status, payment_intent_id, amount_total, amount_deposit, created_at)
    VALUES (@full_name, @phone, @email, @vehicle, @service_type, @date, @start_time, @end_time, @status, @payment_intent_id, @amount_total, @amount_deposit, @created_at)
  `);
  const result = stmt.run(info);

  res.json({ booking_id: result.lastInsertRowid, amount_deposit: deposit, amount_total: total });
});

router.post('/finalize', (req, res) => {
  const { booking_id, payment_intent_id } = req.body;
  if (!booking_id || !payment_intent_id) return res.status(400).json({ error: 'Missing params' });

  const db = getDb();
  const booking = db.prepare(`SELECT * FROM bookings WHERE id=?`).get(booking_id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Update status
  db.prepare(`UPDATE bookings SET status='deposit_paid', payment_intent_id=? WHERE id=?`)
    .run(payment_intent_id, booking_id);

  res.json({ ok: true });
});

export default router;
