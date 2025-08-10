import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.jpg'
const API = import.meta.env.VITE_API_BASE

const PRICE_LABELS = {
  carbon: { front_doors: 'Front Doors €40', rear_doors: 'Rear Doors €40', front_windshield: 'Front Windshield €80', rear_windshield: 'Rear Windshield €80' },
  ceramic:{ front_doors: 'Front Doors €60', rear_doors: 'Rear Doors €60', front_windshield: 'Front Windshield €100', rear_windshield: 'Rear Windshield €100' }
}
const PRICE_VALUES = {
  carbon: { front_doors: 4000, rear_doors: 4000, front_windshield: 8000, rear_windshield: 8000 },
  ceramic:{ front_doors: 6000, rear_doors: 6000, front_windshield:10000, rear_windshield:10000 }
}

export default function BookingForm({ onCreated }){
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)
  const [full_name, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [tint_quality, setQuality] = useState('carbon')
  const [tint_shade, setShade] = useState('50%')
  const [availableShades, setAvailableShades] = useState([])
  const [windows, setWindows] = useState([])

  useEffect(()=>{ if(!date) return; axios.get(`${API}/api/bookings/availability`, { params:{ date } }).then(r=>{ setSlots(r.data.slots); setSlot(null) }) }, [date])
  useEffect(()=>{
    axios.get(`${API}/api/public/shades`)
      .then(res => {
        const list = (res.data && res.data[tint_quality]) ? res.data[tint_quality].filter(s => s.available).map(s => s.shade) : []
        if (list.length) { setAvailableShades(list); setShade(list[0]) } else { setAvailableShades([]) }
      })
      .catch(()=>{ setAvailableShades(tint_quality==='carbon' ? ['50%','35%','20%','5%','1%'] : ['20%','5%']) })
  }, [tint_quality])

  const values = PRICE_VALUES[tint_quality]
  const labels = PRICE_LABELS[tint_quality]
  const amount_total = useMemo(()=> windows.reduce((sum,w)=> sum + (values[w]||0), 0), [windows, values])
  const amount_deposit = Math.floor(amount_total * 0.5)

  const toggleWindow = (k)=> setWindows(prev => prev.includes(k) ? prev.filter(x=>x!==k) : [...prev, k])

  const submit = async (e)=>{
    e.preventDefault()
    if (!slot) return alert('Choose a time')
    if (windows.length === 0) return alert('Select at least one window')
    const payload = { full_name, phone, email, vehicle, tint_quality, tint_shade, windows, date, start_time: slot.start, end_time: slot.end }
    try {
      const r = await axios.post(`${API}/api/bookings/create`, payload)
      onCreated({ ...r.data, customer_email: email })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch(e){ alert(e?.response?.data?.error || 'Error creating booking') }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        {/* Bigger logo height */}
        <img src={logo} className="h-64 w-auto mx-auto rounded-xl" alt="logo" />
        <h1 className="text-3xl font-bold">Book an Appointment</h1>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
          <div><label>Time</label>
            <select value={slot ? `${slot.start}-${slot.end}` : ''} onChange={e=>{ const [s,t]=e.target.value.split('-'); setSlot({ start:s, end:t }) }}>
              <option value="">Select time</option>
              {slots.map((s,i)=><option key={i} value={`${s.start}-${s.end}`}>{s.start} - {s.end}</option>)}
            </select>
          </div>
          <div><label>Full name</label><input value={full_name} onChange={e=>setFullName(e.target.value)} required /></div>
          <div><label>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} required /></div>
          <div><label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
          <div><label>Vehicle</label><input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="e.g., Toyota Corolla 2018" required /></div>
          <div><label>Tint Quality</label>
            <select value={tint_quality} onChange={e=>setQuality(e.target.value)}>
              <option value="carbon">Carbon Tint</option>
              <option value="ceramic">Ceramic Tint</option>
            </select>
          </div>
          <div><label>Tint Shade</label>
            <select value={tint_shade} onChange={e=>setShade(e.target.value)}>
              {availableShades.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label>Windows To Work On</label>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(labels).map(key => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={windows.includes(key)} onChange={()=>toggleWindow(key)} />
                <span>{labels[key]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-black/60 rounded-xl p-3 border border-accent/40">
          <div className="text-sm">Total: <strong>€{(amount_total/100).toFixed(2)}</strong> • Deposit (50%): <strong>€{(amount_deposit/100).toFixed(2)}</strong></div>
          {/* Button text updated */}
          <button className="btn" type="submit">Pay Deposit &amp; Book Appointment</button>
        </div>
      </form>
    </div>
  )
}
