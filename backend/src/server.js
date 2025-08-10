import 'dotenv/config'; import express from 'express'; import cors from 'cors'; import morgan from 'morgan';
import bookingsRouter from './routes/bookings.js'; import paymentsRouter from './routes/payments.js'; import adminRouter from './routes/admin.js'; import publicRouter from './routes/public.js';
const app = express(); const FRONTEND_URL=(process.env.FRONTEND_URL||'').replace(/\/+$/,'');
app.use(cors({origin:FRONTEND_URL||'*'})); app.use(morgan('tiny')); app.use('/api/payments/webhook', express.raw({ type:'application/json' })); app.use(express.json());
app.use('/api/bookings', bookingsRouter); app.use('/api/payments', paymentsRouter); app.use('/api/admin', adminRouter); app.use('/api/public', publicRouter);
app.get('/healthz',(_req,res)=>res.status(200).send('ok')); app.get('/admin',(_req,res)=>{ if(!FRONTEND_URL) return res.status(500).send('FRONTEND_URL not set'); res.redirect(302, `${FRONTEND_URL}/admin`); });
app.use((req,res)=>res.status(404).json({error:'Not found'})); app.use((err,_req,res,_next)=>{ console.error(err); res.status(500).json({error:'Server error'})});
const PORT=process.env.PORT||10000; app.listen(PORT,()=>console.log('Backend listening on',PORT));