import { Router } from 'express';
import { getDb } from '../store/db.js';

const router = Router();

// GET /api/public/shades
router.get('/shades', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT quality, shade, available FROM shade_availability ORDER BY quality, shade`).all();
  const out = { carbon: [], ceramic: [] };
  for (const r of rows) {
    if (!out[r.quality]) out[r.quality] = [];
    out[r.quality].push({ shade: r.shade, available: !!r.available });
  }
  res.json(out);
});

export default router;
