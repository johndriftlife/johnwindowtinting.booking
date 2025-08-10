import { Router } from 'express';
import { getDb } from '../store/db.js';

const router = Router();

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (token && token === process.env.ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

router.get('/bookings', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM bookings ORDER BY date ASC, start_time ASC`).all();
  res.json(rows);
});

router.post('/cancel', requireAdmin, (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) return res.status(400).json({ error: 'Missing booking_id' });
  const db = getDb();
  db.prepare(`UPDATE bookings SET status='cancelled' WHERE id=?`).run(booking_id);
  res.json({ ok: true });
});

export default router;
