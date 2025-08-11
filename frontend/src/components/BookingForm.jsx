import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

// Falls back to same-origin if env is missing
const API = import.meta.env.VITE_API_BASE || ''

const PRICE_VALUES = {
  carbon:  { front_doors: 4000, rear_doors: 4000, front_windshield: 8000,  rear_windshield: 8000 },
  ceramic: { front_doors: 6000, rear_doors: 6000, front_windshield: 10000, rear_windshield: 10000 }
}
const PRICE_LABELS = {
  carbon:  { front_doors:'Front Doors €40', rear_doors:'Rear Doors €40', front_windshield:'Front Windshield €80',  rear_windshield:'Rear Windshield €80' },
  ceramic: { front_doors:'Front Doors €60', rear_doors:'Rear Doors €60', front_windshield:'Front Windshield €100', rear_windshield:'Rear Windshield €100' }
}

export default function BookingForm({ onCreated }) {
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)

  const [full_name, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicle, setVehicle] = useState('')

  const [tint_quality, setQuality] = useState('carbon')
  const [availableShades, setAvailableShades] = useState([])
  const [tint_shades, setTintShades] = useState([]) // always an array (works same on phone/desktop)

  const [windows, setWindows] = useState([])

  // fetch slots when date changes
  useEffect(() => {
    if (!date) return
    axios.get(`${API}/api/bookings/availability`, { params: { date } })
      .then(r => { setSlots(r.data.slots || []); setSlot(null) })
      .catch(() => { setSlots([]); setSlot(null) })
  }, [date])

  // fetch shades when quality changes
  useEffect(() => {
    axios.get(`${API}/api/public/shades`)
      .then(res => {
        const list = (res.data && res.data[tint_quality])
          ? res.data[tint_quality].filter(s => s.available).map(s => s.shade)
          : []
        const fallback = tint_quality === 'carbon' ? ['50%','35%','20%','5%','1%'] : ['20%','5%']
        const usable = list.length ? list : fallback
        setAvailableShades(usable)
        // keep only values still available
        setTintShades(prev => prev.filter(s => usable.includes(s)))
      })
      .catch(() => {
        setAvailableShades(tint_quality === 'carbon' ? ['50%','35%','20%','5%','1%'] : ['20%','5%'])
      })
  }, [tint_quality])

  // prices
  const values = PRICE_VALUES[tint_quality]
  const labels = PRICE_LABELS[tint_quality]
  const amount_total = useMemo(
    () => windows.reduce((sum, k) => sum + (values[k] || 0), 0),
    [windows, values]
  )
  const amount_deposit = Math.floor(amount_total * 0.5)

  const toggleWindow = (k) =>
    setWindows(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]))

  const toggleShade = (shade) =>
    setTintShades(prev => (prev.includes(shade) ? prev.filter(s => s !== shade) : [...prev, shade]))

  // ✅ SUBMIT — always POST; shows exact server message if anything fails
  const submit = async (e) => {
    e.preventDefault()

    if (!date) return alert('Choose a date')
    if (!slot) return alert('Choose a time')
    if (windows.length === 0) return alert('Select at least one window')
    if (tint_shades.length === 0) return alert('Select at least one tint shade')

    const payload = {
      full_name, phone, email, vehicle,
      tint_quality,
      tint_shades, // array (backend accepts this)
      windows,
      date,
      start_time: slot.start,
      end_time: slot.end || slot.start
    }

    try {
      const r = await axios.post(`${API}/api/bookings/create`, payload, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      })

      // require booking id back
      if (!r?.data?.id) {
        console.log('Unexpected create response:', r?.data)
        alert('Server returned 200 but no booking id.')
        return
      }

      onCreated?.({ ...r.data, customer_email: email })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Create error:', err?.response || err)
      const msg = err?.response?.data?.error || err?.message || 'Could not create booking.'
      alert(msg)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='text-center space-y-3'>
        <img src={logo} className='h-64 w-auto mx-auto rounded-xl' alt='logo' />
        <h1 className='text-accent'>Book an Appointment</h1>
      </div>

      <form className='space-y-4' onSubmit={submit} action='#' method='post'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label>Date</label>
            <input type='date' value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label>Time</label>
            <select
              value={slot ? `${slot.start}-${slot.end || slot.start}` : ''}
              onChange={e => {
                const val = e.target.value
                if (!val) return setSlot(null)
                const [s, t] = val.split('-')
                const chosen = slots.find(x => x.start === s && (x.end || x.start) === t)
                if (!chosen?.enabled) return
                setSlot({ start: s, end: chosen.end || s })
              }}
            >
              <option value=''>Select time</option>
              {slots
                .slice()
                .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
                .map((s, i) => (
                  <option key={i} value={`${s.start}-${s.end || s.start}`} disabled={!s.enabled}>
                    {s.start}{s.end && s.end !== s.start ? ` - ${s.end}` : ''}{!s.enabled ? ' (Not available)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div><label>Full name</label><input value={full_name} onChange={e => setFullName(e.target.value)} required /></div>
          <div><label>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
          <div><label>Email address</label><input type='email' value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><label>Vehicle</label><input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder='e.g., Toyota Corolla 2018' required /></div>

          <div>
            <label>Tint Quality</label>
            <select value={tint_quality} onChange={e => setQuality(e.target.value)}>
              <option value='carbon'>Carbon Tint</option>
              <option value='ceramic'>Ceramic Tint</option>
            </select>
          </div>

          <div className='md:col-span-2'>
            <label>Tint Shades</label>
            <div className='grid grid-cols-5 gap-4'>
              {availableShades.map(s => (
                <label key={s} className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={tint_shades.includes(s)}
                    onChange={() => toggleShade(s)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            <div className='text-xs opacity-70 mt-1'>Selected: {tint_shades.join(', ') || 'none'}</div>
          </div>
        </div>

        <div className='space-y-2'>
          <label>Windows To Work On</label>
          <div className='grid md:grid-cols-2 gap-3'>
            {Object.keys(labels).map(k => (
              <label key={k} className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={windows.includes(k)}
                  onChange={() => toggleWindow(k)}
                />
                <span>{labels[k]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className='flex items-center justify-between bg-black/60 rounded-xl p-3 border border-accent/40'>
          <div className='text-sm'>
            Total: <strong>€{(amount_total / 100).toFixed(2)}</strong> • Deposit (50%):{' '}
            <strong>€{(amount_deposit / 100).toFixed(2)}</strong>
          </div>
          <button className='btn' type='submit'>Pay Deposit &amp; Book Appointment</button>
        </div>
      </form>
    </div>
  )
}
