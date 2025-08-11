// backend/src/routes/dev.js
import { Router } from 'express'
import { createCalendarEventSafe } from '../services/googleCalendar.mjs'
const router = Router()
router.get('/calendar-ping', async (_req, res) => {
  try {
    await createCalendarEventSafe({ full_name:'Ping', email:'ping@example.com', date:'2099-01-01', start_time:'10:00', end_time:'', vehicle:'Test', tint_quality:'carbon', tint_shades:['50%'], windows:['front_doors'] })
    res.json({ ok:true })
  } catch (e) { res.status(500).json({ error:String(e) }) }
})
export default router
