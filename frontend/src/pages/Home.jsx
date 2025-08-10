import React, { useState } from 'react'
import BookingForm from '../components/BookingForm.jsx'
import PaymentForm from '../components/PaymentForm.jsx'

export default function Home(){
  const [step, setStep] = useState('book')
  const [pending, setPending] = useState(null)
  return (
    <div className='section space-y-6'>
      <div className='card'>
        {step === 'book' && <BookingForm onCreated={(d)=>{ setPending(d); setStep('pay') }} />}
        {step === 'pay' && pending && <PaymentForm amount={pending.amount_deposit} total={pending.amount_total} bookingId={pending.booking_id} customerEmail={pending.customer_email} onSuccess={()=>setStep('done')} />}
        {step === 'done' && <div className='text-center space-y-1'><h2 className='text-2xl font-semibold text-accent'>Deposit received 🎉</h2><p>Your booking is confirmed. See you soon!</p></div>}
      </div>
      <p className='text-center text-xs text-gray-300'>Tue–Fri 2PM • Sat 9AM / 11AM / 14PM • Sun 10AM • Mon closed · <a href='/admin'>Admin</a></p>
    </div>
  )
}
