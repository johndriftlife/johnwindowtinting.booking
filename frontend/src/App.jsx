import React, { useEffect, useState } from 'react'
import axios from 'axios'
import BookingForm from './components/BookingForm.jsx'
import PaymentForm from './components/PaymentForm.jsx'
import Admin from './components/Admin.jsx'
import logo from './assets/logo.jpg'

const API = import.meta.env.VITE_API_BASE

export default function App() {
  const [step, setStep] = useState('book') // 'book' | 'pay' | 'done'
  const [pending, setPending] = useState(null) // { booking_id, amount_deposit, amount_total }
  const [adminMode, setAdminMode] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'admin') setAdminMode(true)
  }, [])

  if (adminMode) {
    return <Admin />
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="header-bar rounded-2xl p-4 flex justify-between items-center border border-amber-400/30">
  <div className="flex items-center gap-3">
    <img src={logo} alt="John Window Tinting" className="h-10 w-auto rounded-lg border border-amber-400/40" />
    <div>
      <h1 className="text-xl md:text-2xl font-bold tracking-wide">JOHN <span className="text-amber-400">WINDOW TINTING</span></h1>
      <p className="text-xs text-gray-300">Carbon & Ceramic Tint • Book Online</p>
    </div>
  </div>
  <a href="#admin" className="text-sm underline text-amber-300 hover:text-amber-400">Admin</a>
</header>

      <div className="card">
        {step === 'book' && (
          <BookingForm
            onCreated={(data) => { setPending(data); setStep('pay') }}
          />
        )}
        {step === 'pay' && pending && (
          <PaymentForm
            amount={pending.amount_deposit}
            bookingId={pending.booking_id}
            onSuccess={() => setStep('done')}
          />
        )}
        {step === 'done' && (
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Deposit received 🎉</h2>
            <p>Your booking is confirmed. See you soon!</p>
          </div>
        )}
      </div>

      <footer className="text-center text-sm text-gray-500">
        Carbon & Ceramic tint • Open Tue–Fri 2–5pm, Sat 9–5pm, Sun 10–12pm
      </footer>
    </div>
  )
}
