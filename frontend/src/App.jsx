// frontend/src/App.jsx
import React from 'react'
import BookingForm from './components/BookingForm.jsx'
import AdminLogin from './components/AdminLogin.jsx'

export default function App(){
  const atAdmin = typeof window !== 'undefined' && window.location.hash === '#/admin'
  return (
    <div style={{minHeight:'100vh',background:'#000',color:'#D4AF37',padding:'20px'}}>
      <div style={{maxWidth:900,margin:'0 auto'}}>
        {atAdmin ? <AdminLogin/> : <BookingForm/>}
      </div>
    </div>
  )
}
