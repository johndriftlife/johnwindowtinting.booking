import React, { useState } from 'react'
import BookingForm from '../components/BookingForm.jsx'
import PaymentForm from '../components/PaymentForm.jsx'

export default function Home(){
  const [step, setStep] = useState('book')
  const [pending, setPending] = useState(null)

  return (
    <div className="section space-y-6">
      <div className="card">
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
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-accent">Deposit received 🎉</h2>
            <p>Your booking is confirmed. See you soon!</p>
          </div>
        )}
      </div>
      <footer className="text-center text-sm text-gray-300">
        Tue–Fri 2–4pm • Sat 9–11 / 11–13 / 14–16 • Sun 10–12 • Mon closed · <a href="/admin" className="link">Admin</a>
      </footer>
    </div>
  )
}
