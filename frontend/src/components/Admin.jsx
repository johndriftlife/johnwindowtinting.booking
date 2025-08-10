import React, { useEffect, useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Admin({ injectedPassword='' }){
  const [password, setPassword] = useState(injectedPassword)
  const [bookings, setBookings] = useState([])
  const [shades, setShades] = useState([])
  const [slots, setSlots] = useState([])

  useEffect(()=>{ if(injectedPassword) load() }, [])

  const auth = () => ({ headers: { Authorization: `Bearer ${password}` } })

  const load = async ()=>{
    try{
      const [b, sh, sl] = await Promise.all([
        axios.get(`${API}/api/admin/bookings`, auth()),
        axios.get(`${API}/api/admin/shades`, auth()),
        axios.get(`${API}/api/admin/slots`, auth()),
      ])
      setBookings(b.data); setShades(sh.data); setSlots(sl.data)
    }catch(e){
      alert(e?.response?.data?.error || 'Unauthorized / network error')
    }
  }

  const cancel = async (id)=>{ if(!confirm('Cancel this booking?')) return; await axios.post(`${API}/api/admin/cancel`, { booking_id:id }, auth()); load() }
  const refund = async (id)=>{ if(!confirm('Refund the 50% deposit?')) return; await axios.post(`${API}/api/admin/refund`, { booking_id:id }, auth()); load() }
  const toggleShade = async (quality, shade, available)=>{ await axios.post(`${API}/api/admin/toggle-shade`, { quality, shade, available }, auth()); load() }
  const toggleSlot = async (weekday, start_time, enabled)=>{ await axios.post(`${API}/api/admin/toggle-slot`, { weekday, start_time, enabled }, auth()); load() }

  return (
    <div style={{maxWidth: '1000px', margin: '24px auto', padding: 16}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>Admin</h1>
        <a href="/">Back to site</a>
      </div>

      <div style={{border:'1px solid #ddd', borderRadius:12, padding:12, marginTop:12}}>
        <div style={{display:'flex', gap:8, alignItems:'end'}}>
          <div style={{flex:1}}>
            <label>Admin key</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:'block', width:'100%', padding:8}} />
          </div>
          <button onClick={load}>Load</button>
        </div>
        <p style={{fontSize:12, opacity:.8}}>Manage bookings and refunds. Toggle which shades and slots are available.</p>
      </div>

      <div style={{border:'1px solid #ddd', borderRadius:12, padding:12, marginTop:16, overflowX:'auto'}}>
        <h2>Bookings</h2>
        <table style={{width:'100%', fontSize:14}}>
          <thead><tr>
            <th>Date</th><th>Time</th><th>Name</th><th>Email</th><th>Quality/Shade</th><th>Windows</th><th>Total/Deposit</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id}>
                <td>{b.date}</td>
                <td>{b.start_time}–{b.end_time}</td>
                <td>{b.full_name}</td>
                <td>{b.email}</td>
                <td>{b.tint_quality}/{b.tint_shade}</td>
                <td>{JSON.parse(b.windows_json).join(', ')}</td>
                <td>€{(b.amount_total/100).toFixed(2)} / €{(b.amount_deposit/100).toFixed(2)}</td>
                <td>{b.status}</td>
                <td>
                  {b.status !== 'cancelled' && <button onClick={()=>cancel(b.id)}>Cancel</button>}
                  {b.status === 'deposit_paid' && <button onClick={()=>refund(b.id)} style={{marginLeft:8}}>Refund deposit</button>}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (<tr><td colSpan="9">No bookings yet.</td></tr>)}
          </tbody>
        </table>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16}}>
        <div style={{border:'1px solid #ddd', borderRadius:12, padding:12}}>
          <h2>Shades Availability</h2>
          {['carbon','ceramic'].map(q => (
            <div key={q} style={{marginBottom:8}}>
              <div style={{fontWeight:600, textTransform:'capitalize'}}>{q}</div>
              {shades.filter(s=>s.quality===q).map(s => (
                <label key={s.shade} style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input type="checkbox" checked={!!s.available} onChange={e=>toggleShade(q, s.shade, e.target.checked?1:0)} />
                  <span>{s.shade}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div style={{border:'1px solid #ddd', borderRadius:12, padding:12}}>
          <h2>Slot Availability</h2>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {slots.map(sl => (
              <label key={`${sl.weekday}-${sl.start_time}`} style={{display:'flex', gap:8, alignItems:'center'}}>
                <input type="checkbox" checked={!!sl.enabled} onChange={e=>toggleSlot(sl.weekday, sl.start_time, e.target.checked?1:0)} />
                <span>{WEEKDAYS[sl.weekday]} {sl.start_time}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
