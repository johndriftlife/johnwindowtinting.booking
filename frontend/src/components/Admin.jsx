import React, { useEffect, useState } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_BASE
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export default function Admin({ injectedPassword='' }){
  const [password,setPassword]=useState(injectedPassword); const [bookings,setBookings]=useState([]); const [shades,setShades]=useState([]); const [slots,setSlots]=useState([])
  useEffect(()=>{ if(injectedPassword) load() },[])
  const auth=()=>({ headers:{ Authorization:`Bearer ${password}` } })
  const load=async()=>{ try{ const [b,sh,sl]=await Promise.all([axios.get(`${API}/api/admin/bookings`,auth()),axios.get(`${API}/api/admin/shades`,auth()),axios.get(`${API}/api/admin/slots`,auth())]); setBookings(b.data); setShades(sh.data); setSlots(sl.data) }catch(e){ alert(e?.response?.data?.error||'Unauthorized / network error') } }
  const cancel=async(id)=>{ if(!confirm('Cancel this booking?'))return; await axios.post(`${API}/api/admin/cancel`,{booking_id:id},auth()); load() }
  const refund=async(id)=>{ if(!confirm('Refund the 50% deposit?'))return; await axios.post(`${API}/api/admin/refund`,{booking_id:id},auth()); load() }
  const toggleShade=async(q,shade,avail)=>{ await axios.post(`${API}/api/admin/toggle-shade`,{quality:q,shade,available:avail},auth()); load() }
  const toggleSlot=async(w,st,en)=>{ await axios.post(`${API}/api/admin/toggle-slot`,{weekday:w,start_time:st,enabled:en},auth()); load() }
  return (<div className='section'>
    <div className='flex items-center justify-between'><h1 className='text-accent'>Admin</h1><a href='/'>Back to site</a></div>
    <div className='card mt-4'><div className='flex gap-2 items-end'><div className='flex-1'><label>Admin key</label><input type='password' value={password} onChange={e=>setPassword(e.target.value)} /></div><button className='btn' onClick={load}>Load</button></div><p className='text-xs text-gray-400 mt-2'>Manage bookings and refunds. Toggle which shades and slots are available.</p></div>
    <div className='card mt-4 overflow-x-auto'><h2 className='text-xl text-accent mb-2'>Bookings</h2><table><thead><tr className='text-accent'><th>Date</th><th>Time</th><th>Name</th><th>Email</th><th>Quality/Shade</th><th>Windows</th><th>Total/Deposit</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {bookings.map(b=>(<tr key={b.id} className='border-t border-accent/20'><td>{b.date}</td><td>{b.start_time}–{b.end_time}</td><td>{b.full_name}</td><td>{b.email}</td><td>{b.tint_quality}/{b.tint_shade}</td><td>{JSON.parse(b.windows_json).join(', ')}</td><td>€{(b.amount_total/100).toFixed(2)} / €{(b.amount_deposit/100).toFixed(2)}</td><td>{b.status}</td><td className='space-x-2'>{b.status!=='cancelled' && <button className='btn' onClick={()=>cancel(b.id)}>Cancel</button>}{b.status==='deposit_paid' && <button className='btn' onClick={()=>refund(b.id)}>Refund deposit</button>}</td></tr>))}
      {bookings.length===0 && (<tr><td colSpan='9' className='py-2'>No bookings yet.</td></tr>)}
    </tbody></table></div>
    <div className='grid md:grid-cols-2 gap-4 mt-4'>
      <div className='card'><h2 className='text-xl text-accent mb-2'>Shades Availability</h2>
        {['carbon','ceramic'].map(q=>(<div key={q} className='mb-2'><div className='font-semibold capitalize'>{q}</div>{shades.filter(s=>s.quality===q).map(s=>(<label key={s.shade} className='flex items-center gap-2'><input type='checkbox' checked={!!s.available} onChange={e=>toggleShade(q,s.shade,e.target.checked?1:0)} /><span>{s.shade}</span></label>))}</div>))}
      </div>
      <div className='card'><h2 className='text-xl text-accent mb-2'>Slot Availability</h2><div className='grid grid-cols-2 gap-2'>{slots.map(sl=>(<label key={`${sl.weekday}-${sl.start_time}`} className='flex items-center gap-2'><input type='checkbox' checked={!!sl.enabled} onChange={e=>toggleSlot(sl.weekday,sl.start_time,e.target.checked?1:0)} /><span>{WEEKDAYS[sl.weekday]} {sl.start_time}</span></label>))}</div></div>
    </div>
  </div>)
}