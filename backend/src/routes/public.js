// backend/src/routes/public.js
import { Router } from 'express'
import { db } from '../store.js'
const router = Router()
router.get('/shades', (_req, res) => { res.json(db.admin.shades) })
export default router
