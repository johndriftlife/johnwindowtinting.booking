// frontend/src/components/BookingForm.jsx
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

const API = import.meta.env.VITE_API_BASE

// Prices
const PRICE_LABELS = {
  carbon: {
    front_doors: 'Front Doors €40',
    rear_doors: 'Rear Doors €40',
    front_windshield: 'Front Windshield €80',
    rear_windshield: 'Rear Windshield €80',
  },
  ceramic: {
    front_doors: 'Front Doors €60',
    rear_doors: 'Rear Doors €60',
    front_windshield: 'Front Windshield €100',
    rear_windshield: 'Rear Windshield €100',
  },
}
const PRICE_VALUES = {
  carbon: {
    front_doors: 4000,
    rear_doors: 4000,
    front_windshield: 8000,
    rear_windshield: 8000,
  },
  ceramic: {
    front_doors: 6000,
    rear_doors: 6000,
    front_windshield: 10000,
    rear_windshield: 10000,
  },
}

export default function BookingForm() {
  // form
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)

  const [full_name, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicle, setVehicle] = useState('')

  const [tint_quality, setQuality] = useState('carbon') // carbon | ceramic
  const [availableShades, setAvailableShades] = useState([])
  const [tint_shades, setTintShades] = useState([]) // multiple via checkboxes

  const [windows, setWindows] = useState([])

  // load slots whenever date changes
  useEffect(() => {
    if (!date) return
    axios
      .get(`${API}/api/bookings/availability`, { params: { date } })
      .then((r) => {
        setSlots(r.data.slots || [])
        setSlot(null)
      })
      .catch(() => setSlots([]))
  }, [date])

  // load available shades from admin settings; fall back to defaults
  useEffect(() => {
    axios
      .get(`${API}/api/public/shades`)
      .then((res) => {
        const list =
          res.data && res.data[tint_quality]
            ? res.data[tint_quality].filter((s) => s.available).map((s) => s.shade)
            : []
        if (list.length) {
          setAvailableShades(list)
          // keep any already selected that are still available
          setTintShades((prev) => prev.filter((x) => list.includes(x)))
        } else {
          // fallback defaults
          setAvailableShades(
            tint_quality === 'carbon' ? ['50%', '35%', '20%', '5%', '1%'] : ['20%', '5%']
          )
        }
      })
      .catch(() => {
        setAvailableShades(
          tint_quality === 'carbon' ? ['50%', '35%', '20%', '5%', '1%'] : ['20%', '5%']
        )
      })
  }, [tint_quality])

  const priceValues = PRICE_VALUES[tint_quality]
  const priceLabels = PRICE_LABELS[tint_quality]

  const amount_total = useMemo(
    () => windows.reduce((sum, key) => sum + (priceValues[key] || 0), 0),
    [windows, priceValues]
  )
  const amount_deposit = Math.floor(amount_total * 0.5)

  const toggleWindow = (key) =>
    setWindows((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))

  const toggleShade = (shade) =>
    setTintShades((prev) => (prev.includes(shade) ? prev.filter((s) => s !== shade) : [...prev, shade]))

  async function handleSubmit(e) {
    e.preventDefault()

    if (!date) return alert('Please choose a date.')
    if (!slot) return alert('Please choose a time.')
    if (windows.length === 0) return alert('Please select at least one window.')
    if (amount_deposit <= 0) return alert('Deposit cannot be zero.')

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
      end_time: slot.end,
      amount_total,
      amount_deposit,
    }

    try {
      // 1) Create the booking
      const createRes = await axios.post(`${API}/api/bookings/create`, payload)
      const booking_id = createRes.data?.booking_id
      if (!booking_id) throw new Error('No booking_id returned')

      // 2) Start Stripe Checkout (correct endpoint)
      const payRes = await axios.post(`${API}/api/payments/checkout`, { booking_id })
      const url = payRes.data?.url
      if (!url) throw new Error('No checkout url returned')

      // 3) Redirect to Stripe
      window.location.assign(url)
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.error || 'Stripe error')
    }
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="text-center space-y-3">
        <img src={logo} className="h-64 w-auto mx-auto rounded-xl" alt="logo" />
        <h1 className="text-accent text-3xl font-bold">Book an Appointment</h1>
      </div>

      {/* form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Time */}
          <div>
            <label className="block mb-1">Time</label>
            <select
              value={slot ? `${slot.start}-${slot.end}` : ''}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return setSlot(null)
                const [s, t] = v.split('-')
                const chosen = slots.find((x) => x.start === s && x.end === t)
                if (!chosen?.enabled) return
                setSlot({ start: s, end: t })
              }}
            >
              <option value="">Select time</option>
              {slots
                .slice()
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((s, i) => (
                  <option key={i} value={`${s.start}-${s.end}`} disabled={!s.enabled}>
                    {s.start}
                    {s.end ? ` - ${s.end}` : ''} {!s.enabled ? '(Not available)' : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Name / Phone */}
          <div>
            <label className="block mb-1">Full name</label>
            <input value={full_name} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          {/* Email / Vehicle */}
          <div>
            <label className="block mb-1">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Vehicle</label>
            <input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="e.g., Toyota Corolla 2018"
              required
            />
          </div>

          {/* Quality */}
          <div>
            <label className="block mb-1">Tint Quality</label>
            <select value={tint_quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="carbon">Carbon Tint</option>
              <option value="ceramic">Ceramic Tint</option>
            </select>
          </div>

          {/* Shades (checkboxes, multi-select) */}
          <div>
            <label className="block mb-1">Tint Shades</label>
            <div className="grid grid-cols-3 gap-3">
              {availableShades.map((shade) => (
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
          </div>
        </div>

        {/* Windows To Work On */}
        <div className="space-y-2">
          <label className="block">Windows To Work On</label>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(priceLabels).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={windows.includes(k)}
                  onChange={() => toggleWindow(k)}
                />
                <span>{priceLabels[k]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Totals + Button */}
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
