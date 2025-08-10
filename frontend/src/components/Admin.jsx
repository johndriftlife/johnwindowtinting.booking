import React, { useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Admin(){
  const [password, setPassword] = useState('')
  const [bookings, setBookings] = useState([])
  const [shades, setShades] = useState([])
  const [slots, setSlots] = useState([])
  const auth = () => ({ headers: { Authorization: `Bearer ${password}` } })

  const load = async ()=>{
    const [b, sh, sl] = await Promise.all([
      axios.get(`${API}/api/admin/bookings`, auth()),
      axios.get(`${API}/api/admin/shades`, auth()),
      axios.get(`${API}/api/admin/slots`, auth()),
    ])
    setBookings(b.data); setShades(sh.data); setSlots(sl.data)
  }

  const cancel = async (id)=>{ if(!confirm('Cancel this booking?')) return; await axios.post(`${API}/api/admin/cancel`, { booking_id:id }, auth()); load() }
  const refund = async (id)=>{ if(!confirm('Refund the 50% deposit?')) return; await axios.post(`${API}/api/admin/refund`, { booking_id:id }, auth()); load() }
  const toggleShade = async (quality, shade, available)=>{ await axios.post(`${API}/api/admin/toggle-shade`, { quality, shade, available }, auth()); load() }
  const toggleSlot = async (weekday, start_time, enabled)=>{ await axios.post(`${API}/api/admin/toggle-slot`, { weekday, start_time, enabled }, auth()); load() }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin</h1>
        <a href="#" className="text-sm underline">Back to site</a>
      </header>

      <div className="card space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm mb-1">Admin password</label>
            <input type="password" className="w-full border rounded p-2" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button className="btn" onClick={load}>Load</button>
        </div>
      </div>

      <div className="card overflow-auto">
        <h2 className="text-lg font-semibold mb-3">Bookings</h2>
        <table className="min-w-full text-sm">
          <thead><tr className="text-left">
            <th className="p-2">Date</th><th className="p-2">Time</th><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Quality/Shade</th><th className="p-2">Windows</th><th className="p-2">Status</th><th className="p-2">Actions</th>
          </tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.date}</td>
                <td className="p-2">{b.start_time}–{b.end_time}</td>
                <td className="p-2">{b.full_name}</td>
                <td className="p-2">{b.email}</td>
                <td className="p-2">{b.tint_quality}/{b.tint_shade}</td>
                <td className="p-2">{JSON.parse(b.windows_json).join(', ')}</td>
                <td className="p-2">{b.status}</td>
                <td className="p-2 flex gap-2">
                  {b.status !== 'cancelled' && <button className="btn" onClick={()=>cancel(b.id)}>Cancel</button>}
                  {b.status === 'deposit_paid' && <button className="btn" onClick={()=>refund(b.id)}>Refund deposit</button>}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (<tr><td className="p-2" colSpan="8">No bookings yet.</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Shades Availability</h2>
          {['carbon','ceramic'].map(q => (
            <div key={q} className="mb-2">
              <div className="font-medium capitalize">{q}</div>
              {shades.filter(s=>s.quality===q).map(s => (
                <label key={s.shade} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!s.available} onChange={e=>toggleShade(q, s.shade, e.target.checked?1:0)} />
                  <span>{s.shade}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Slot Availability</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {slots.map(sl => (
              <label key={`${sl.weekday}-${sl.start_time}`} className="flex items-center gap-2 text-sm">
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
