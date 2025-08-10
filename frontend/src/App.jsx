import React, { useEffect, useState } from 'react'
import BookingForm from './components/BookingForm.jsx'
import PaymentForm from './components/PaymentForm.jsx'
import Admin from './components/Admin.jsx'

export default function App(){
  const [step, setStep] = useState('book')
  const [pending, setPending] = useState(null)
  const [adminMode, setAdminMode] = useState(false)
  useEffect(()=>{ const hash = window.location.hash.replace('#',''); if(hash==='admin') setAdminMode(true) }, [])
  if (adminMode) return <Admin />
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="card">
        {step === 'book' && <BookingForm onCreated={(data)=>{ setPending(data); setStep('pay') }} />}
        {step === 'pay' && pending && <PaymentForm amount={pending.amount_deposit} total={pending.amount_total} bookingId={pending.booking_id} customerEmail={pending.customer_email} onSuccess={()=>setStep('done')} />}
        {step === 'done' && <div className="text-center space-y-2"><h2 className="text-xl font-semibold">Deposit received 🎉</h2><p>Your booking is confirmed. See you soon!</p></div>}
      </div>
      <footer className="text-center text-sm text-gray-500">Tue–Fri 2–4pm • Sat 9–11 / 11–13 / 14–16 • Sun 10–12 • Mon closed</footer>
    </div>
  )
}
