import express from 'express'; import { db } from '../store.js'; const router = express.Router();
router.get('/shades', (_req,res)=> res.json({ carbon: db.shades.carbon, ceramic: db.shades.ceramic }));
export default router;