// frontend/src/components/AdminLogin.jsx
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE
const ACCENT = '#C62828'

export default function AdminLogin(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    const m = document.createElement('meta')
    m.setAttribute('name','robots'); m.setAttribute('content','noindex,nofollow')
    document.head.appendChild(m)
    return ()=>{ try{ document.head.removeChild(m) }catch{} }
  }, [])

  async function submit(e){
    e.preventDefault()
    setError('')
    if(!API){ setError('Missing VITE_API_BASE'); return }
    try{
      setLoading(true)
      const { data } = await axios.post(`${API.replace(/\/$/,'')}/api/auth/login`, { username, password })
      if(!data?.token){ throw new Error('No token returned') }
      localStorage.setItem('admin_token', data.token)
      alert('Logged in!')
      // back to booking page without full reload
      window.location.hash = ''
    }catch(err){
      setError(err?.response?.data?.error || err?.message || 'Login failed')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div style={{maxWidth:420,margin:'40px auto',background:'#111',border:'1px solid #D4AF3766',borderRadius:12,padding:20,color:'#D4AF37'}}>
      <h2 style={{marginTop:0,marginBottom:12}}>Admin Login</h2>
      <form onSubmit={submit} style={{display:'grid',gap:12}}>
        <div>
          <label style={{display:'block',marginBottom:6}}>Email</label>
          <input type="email" value={username} onChange={e=>setUsername(e.target.value)} required/>
        </div>
        <div>
          <label style={{display:'block',marginBottom:6}}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
        </div>
        {error && <div style={{color:'#ff6b6b',fontSize:13}}>{error}</div>}
        <button type="submit" disabled={loading}
          style={{background:ACCENT,color:'#000',padding:'8px 12px',borderRadius:12,fontWeight:700}}>
          {loading?'Signing in…':'Sign In'}
        </button>
      </form>
    </div>
  )
}
