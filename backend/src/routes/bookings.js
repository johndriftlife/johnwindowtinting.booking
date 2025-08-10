import express from 'express'; import { db } from '../store.js'; import { v4 as uuid } from 'uuid'; const router = express.Router();
const PRICE_VALUES={carbon:{front_doors:4000,rear_doors:4000,front_windshield:8000,rear_windshield:8000},ceramic:{front_doors:6000,rear_doors:6000,front_windshield:10000,rear_windshield:10000}};
const weekdayOf=(d)=> new Date(d+'T00:00:00').getUTCDay();
const endFromStart=(s)=>{const [h,m]=s.split(':').map(Number);const eh=(h+2).toString().padStart(2,'0');return `${eh}:${m.toString().padStart(2,'0')}`;}
router.get('/availability', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const w = weekdayOf(date)

  // Return ALL slots for that weekday, including whether each one is enabled
  const slots = db.slots
    .filter(s => s.weekday === w)
    .map(s => ({
      start: s.start_time,
      end: endFromStart(s.start_time),
      enabled: !!s.enabled,
    }))

  res.json({ date, slots })
})

router.post('/create',(req,res)=>{const {full_name,phone,email,vehicle,tint_quality,tint_shade,windows,date,start_time,end_time}=req.body||{};if(!full_name||!phone||!email||!vehicle||!tint_quality||!tint_shade||!Array.isArray(windows)||!date||!start_time||!end_time)return res.status(400).json({error:'missing fields'});const values=PRICE_VALUES[tint_quality]||{};const total=windows.reduce((s,w)=>s+(values[w]||0),0);const deposit=Math.floor(total*0.5);const id=uuid();db.bookings.push({id,full_name,phone,email,vehicle,tint_quality,tint_shade,windows_json:JSON.stringify(windows),date,start_time,end_time,amount_total:total,amount_deposit:deposit,status:'pending_payment',payment_intent_id:null});res.json({booking_id:id,amount_total:total,amount_deposit:deposit});});
router.post('/finalize',(req,res)=>{const {booking_id,payment_intent_id}=req.body||{};const b=db.bookings.find(x=>x.id===booking_id);if(!b)return res.status(404).json({error:'booking not found'});b.payment_intent_id=payment_intent_id;b.status='deposit_paid';res.json({ok:true});});
export default router;
