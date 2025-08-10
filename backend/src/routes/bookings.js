import { Router } from 'express';
import { getDb } from '../store/db.js';
import { FIXED_SLOTS, PRICES } from '../config/businessHours.js';
import { isOverlap } from '../utils/time.js';

const router = Router();

function slotsForDate(dateStr) {
  const weekday = new Date(dateStr + 'T00:00:00').getDay();
  const base = FIXED_SLOTS[weekday] || [];
  const db = getDb();
  const toggles = db.prepare('SELECT start_time, enabled FROM slot_toggles WHERE weekday=?').all(weekday);
  const enabledMap = new Map(toggles.map(t => [t.start_time, !!t.enabled]));
  return base.filter(s => enabledMap.get(s.start) !== false);
}

router.get('/availability', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  const db = getDb();
  const slots = slotsForDate(date);
  const existing = db.prepare(`SELECT start_time, end_time FROM bookings WHERE date=? AND status!='cancelled' AND status!='deposit_refunded'`).all(date);
  const available = slots.filter(slot => !existing.some(b => isOverlap(slot.start, slot.end, b.start_time, b.end_time)));
  res.json({ date, slots: available });
});

function computeTotal(quality, windows) {
  const map = PRICES[quality]; if (!map) return null;
  let total = 0;
  for (const w of windows) { if (!map[w]) return null; total += map[w]; }
  return total;
}

router.post('/create', (req, res) => {
  const { full_name, phone, email, vehicle, tint_quality, tint_shade, windows, date, start_time, end_time } = req.body;
  if (!['carbon','ceramic'].includes(tint_quality)) return res.status(400).json({ error: 'Invalid tint_quality' });
  if (!Array.isArray(windows) || windows.length === 0) return res.status(400).json({ error: 'Select at least one window' });

  const db = getDb();

  const slots = slotsForDate(date);
  if (!slots.some(s => s.start === start_time && s.end === end_time)) return res.status(409).json({ error: 'Selected time is not available' });

  const conflict = db.prepare(`SELECT id FROM bookings WHERE date=? AND status!='cancelled' AND status!='deposit_refunded' AND ((? < end_time) AND (start_time < ?))`).get(date, start_time, end_time);
  if (conflict) return res.status(409).json({ error: 'Time slot already booked' });

  const amount_total = computeTotal(tint_quality, windows);
  if (amount_total == null) return res.status(400).json({ error: 'Invalid window selection' });
  const amount_deposit = Math.floor(amount_total * 0.5);

  const info = {
    full_name, phone, email, vehicle, tint_quality, tint_shade,
    windows_json: JSON.stringify(windows),
    date, start_time, end_time, status: 'pending_payment', payment_intent_id: null,
    amount_total, amount_deposit, created_at: new Date().toISOString()
  };

  const stmt = db.prepare(`INSERT INTO bookings 
    (full_name, phone, email, vehicle, tint_quality, tint_shade, windows_json, date, start_time, end_time, status, payment_intent_id, amount_total, amount_deposit, created_at)
    VALUES (@full_name, @phone, @email, @vehicle, @tint_quality, @tint_shade, @windows_json, @date, @start_time, @end_time, @status, @payment_intent_id, @amount_total, @amount_deposit, @created_at)`);
  const result = stmt.run(info);
  res.json({ booking_id: result.lastInsertRowid, amount_total, amount_deposit });
});

router.post('/finalize', (req, res) => {
  const { booking_id, payment_intent_id } = req.body;
  if (!booking_id || !payment_intent_id) return res.status(400).json({ error: 'Missing params' });
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(booking_id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  db.prepare(`UPDATE bookings SET status='deposit_paid', payment_intent_id=? WHERE id=?`).run(payment_intent_id, booking_id);
  res.json({ ok: true });
});

export default router;
