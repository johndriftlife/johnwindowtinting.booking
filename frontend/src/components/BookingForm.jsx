import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

const API = import.meta.env.VITE_API_BASE

// Labels (shown to users)
const PRICE_LABELS = {
  carbon: {
    front_doors: 'Front Doors €40',
    rear_doors: 'Rear Doors €40',
    front_windshield: 'Front Windshield €80',
    rear_windshield: 'Rear Windshield €80'
  },
  ceramic: {
    front_doors: 'Front Doors €60',
    rear_doors: 'Rear Doors €60',
    front_windshield: 'Front Windshield €100',
    rear_windshield: 'Rear Windshield €100'
  }
}

// Values (in cents)
const PRICE_VALUES = {
  carbon: {
    front_doors: 4000,
    rear_doors: 4000,
    front_windshield: 8000,
    rear_windshield: 8000
  },
  ceramic: {
    front_doors: 6000,
    rear_doors: 6000,
    front_windshield: 10000,
    rear_windshield: 10000
  }
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
  const [tint_shades, setTintShades] = useState([]) // multi-select via checkboxes

  const [windows, setWindows] = useState([])

  // Fetch availability when a date is selected
  useEffect(() => {
    if (!date) return
    axios
      .get(`${API}/api/bookings/availability`, { params: { date } })
      .then(r => {
        setSlots(r.data.slots || [])
        setSlot(null)
      })
      .catch(() => setSlots([]))
  }, [date])

  // Fetch shade availability from backend and default/fallback lists
  useEffect(() => {
    let cancelled = false
    axios
      .get(`${API}/api/public/shades`)
      .then(res => {
        const list =
          res.data && res.data[tint_quality]
            ? res.data[tint_quality].filter(s => s.available).map(s => s.shade)
            : []
        if (cancelled) return
        if (list.length) {
          setAvailableShades(list)
          // keep only still-available selections
          setTintShades(prev => prev.filter(s => list.includes(s)))
          if (list.length && !list.some(s => tint_shades.includes(s))) {
            setTintShades([list[0]])
          }
        } else {
          // fallback defaults
          const fb = tint_quality === 'carbon' ? ['50%', '35%', '20%', '5%', '1%'] : ['20%', '5%']
          setAvailableShades(fb)
          setTintShades(prev => (prev.length ? prev.filter(s => fb.includes(s)) : [fb[0]]))
        }
      })
      .catch(() => {
        const fb = tint_quality === 'carbon' ? ['50%', '35%', '20%', '5%', '1%'] : ['20%', '5%']
        setAvailableShades(fb)
        setTintShades(prev => (prev.length ? prev.filter(s => fb.includes(s)) : [fb[0]]))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tint_quality])

  const values = PRICE_VALUES[tint_quality]
  const labels = PRICE_LABELS[tint_quality]

  const amount_total = useMemo(
    () => windows.reduce((sum, w) => sum + (values[w] || 0), 0),
    [windows, values]
  )
  const amount_deposit = Math.floor(amount_total * 0.5)

  const toggleWindow = key =>
    setWindows(prev => (prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]))

  const toggleShade = shade =>
    setTintShades(prev => (prev.includes(shade) ? prev.filter(x => x !== shade) : [...prev, shade]))

  const submit = async e => {
    e.preventDefault()
    try {
      if (!date) return alert('Please choose a date')
      if (!slot) return alert('Please choose a time')
      if (!windows.length) return alert('Select at least one window to work on')
      if (!tint_shades.length) return alert('Select at least one tint shade')

      const payload = {
        full_name,
        phone,
        email,
        vehicle,
        tint_quality,
        tint_shades, // array
        windows,
        date,
        start_time: slot.start,
        end_time: slot.end
      }

      // 1) Create booking (server will compute totals and return booking_id)
      const createRes = await axios.post(`${API}/api/bookings/create`, payload)
      const { booking_id } = createRes.data || {}

      if (!booking_id) {
        return alert('Could not create booking. Please try again.')
      }

      // Optional hook for UI
      if (onCreated) onCreated(createRes.data)

      // 2) Ask backend to create a Stripe Checkout Session and redirect there
      const chk = await axios.post(`${API}/api/payments/checkout`, { booking_id })
      const url = chk.data?.url
      if (!url) return alert('Could not start payment. Please try again.')
      window.location.href = url
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <img src={logo} className="h-64 w-auto mx-auto rounded-xl" alt="logo" />
        <h1 className="text-accent">Book an Appointment</h1>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div>
            <label>Time</label>
            <select
              value={slot ? `${slot.start}-${slot.end}` : ''}
              onChange={e => {
                const val = e.target.value
                if (!val) return setSlot(null)
                const [s, t] = val.split('-')
                const chosen = slots.find(x => x.start === s && x.end === t)
                if (!chosen?.enabled) return
                setSlot({ start: s, end: t })
              }}
              required
            >
              <option value="">Select time</option>
              {slots
                .slice()
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((s, i) => (
                  <option key={i} value={`${s.start}-${s.end}`} disabled={!s.enabled}>
                    {s.start} - {s.end}
                    {!s.enabled ? ' (Not available)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label>Full name</label>
            <input value={full_name} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div>
            <label>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>

          <div>
            <label>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div>
            <label>Vehicle</label>
            <input
              value={vehicle}
              onChange={e => setVehicle(e.target.value)}
              placeholder="e.g., Toyota Corolla 2018"
              required
            />
          </div>

          <div>
            <label>Tint Quality</label>
            <select value={tint_quality} onChange={e => setQuality(e.target.value)}>
              <option value="carbon">Carbon Tint</option>
              <option value="ceramic">Ceramic Tint</option>
            </select>
          </div>

          <div>
            <label>Tint Shades</label>
            <div className="grid grid-cols-2 gap-2">
              {availableShades.map(shade => (
                <label key={shade} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tint_shades.includes(shade)}
                    onChange={() => toggleShade(shade)}
                  />
                  <span>{shade}</span>
                </label>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-1">
              Selected: {tint_shades.length ? tint_shades.join(', ') : 'none'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label>Windows To Work On</label>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(labels).map(k => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={windows.includes(k)}
                  onChange={() => toggleWindow(k)}
                />
                <span>{labels[k]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-black/60 rounded-xl p-3 border border-accent/40">
          <div className="text-sm">
            Total: <strong>€{(amount_total / 100).toFixed(2)}</strong> • Deposit (50%):{' '}
            <strong>€{(amount_deposit / 100).toFixed(2)}</strong>
          </div>
          <button className="btn" type="submit">
            Pay Deposit &amp; Book Appointment
          </button>
        </div>
      </form>
    </div>
  )
}
