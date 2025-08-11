// frontend/src/pages/Home.jsx
import React from 'react'
import BookingForm from '../components/BookingForm.jsx'

export default function Home() {
  return (
    <div style={{minHeight:'100vh',background:'#000',color:'#D4AF37',padding:'20px'}}>
      <div style={{maxWidth:900,margin:'0 auto'}}>
        <BookingForm />
      </div>
    </div>
  )
}
