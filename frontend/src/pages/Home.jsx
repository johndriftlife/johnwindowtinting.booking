import React, { useState } from 'react'
import BookingForm from '../components/BookingForm.jsx'
import PaymentForm from '../components/PaymentForm.jsx'

export default function Home(){
  const [step, setStep] = useState('book')
  const [pending, setPending] = useState(null)

  return (
    <div style={{maxWidth: '760px', margin: '0 auto', padding: 16}}>
      <div style={{border:'1px solid #ddd', borderRadius:12, padding:16}}>
        {step === 'book' && <BookingForm onCreated={(data)=>{ setPending(data); setStep('pay') }} />}
        {step === 'pay' && pending && (
          <PaymentForm
            amount={pending.amount_deposit}
            total={pending.amount_total}
            bookingId={pending.booking_id}
            customerEmail={pending.customer_email}
            onSuccess={()=>setStep('done')}
          />
        )}
        {step === 'done' && (
          <div style={{textAlign:'center'}}>
            <h2>Deposit received 🎉</h2>
            <p>Your booking is confirmed. See you soon!</p>
          </div>
        )}
      </div>
      <p style={{textAlign:'center', fontSize:12, opacity:.8, marginTop:8}}>
        Tue–Fri 2–4pm • Sat 9–11 / 11–13 / 14–16 • Sun 10–12 • Mon closed · <a href="/admin">Admin</a>
      </p>
    </div>
  )
}
