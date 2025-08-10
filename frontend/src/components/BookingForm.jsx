import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE

export default function BookingForm({ onCreated }) {
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)

  const [full_name, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [service_type, setServiceType] = useState('carbon')

  useEffect(() => {
    if (!date) return
    axios.get(`${API}/api/bookings/availability`, { params: { date } }).then(res => {
      setSlots(res.data.slots)
      setSlot(null)
    })
  }, [date])

  const submit = async (e) => {
    e.preventDefault()
    if (!slot) return alert('Choose a time')

    const payload = {
      full_name, phone, email, vehicle, service_type,
      date, start_time: slot.start, end_time: slot.end
    }

    try {
      const res = await axios.post(`${API}/api/bookings/create`, payload)
      onCreated(res.data)
    } catch (err) {
      alert(err?.response?.data?.error || 'Error creating booking')
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <h2 className="text-xl font-semibold">Book your appointment</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Date</label>
          <input type="date" className="w-full border rounded p-2"
            value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Available times</label>
          <select className="w-full border rounded p-2"
            value={slot ? `${slot.start}-${slot.end}` : ''}
            onChange={e => {
              const [s, t] = e.target.value.split('-')
              setSlot({ start: s, end: t })
            }}>
            <option value="">Select a slot</option>
            {slots.map((s, idx) => (
              <option key={idx} value={`${s.start}-${s.end}`}>
                {s.start} - {s.end}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Full name</label>
          <input className="w-full border rounded p-2" value={full_name} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input className="w-full border rounded p-2" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="w-full border rounded p-2" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Vehicle</label>
          <input className="w-full border rounded p-2" value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="e.g., Toyota Corolla 2018" />
        </div>
        <div>
          <label className="block text-sm mb-1">Service</label>
          <select className="w-full border rounded p-2" value={service_type} onChange={e => setServiceType(e.target.value)}>
            <option value="carbon">Carbon (50% deposit)</option>
            <option value="ceramic">Ceramic (50% deposit)</option>
          </select>
        </div>
      </div>

      <button className="btn" type="submit">Continue to 50% deposit</button>
    </form>
  )
}
