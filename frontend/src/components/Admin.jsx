import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE

export default function Admin() {
  const [password, setPassword] = useState('')
  const [bookings, setBookings] = useState([])

  const fetchBookings = async () => {
    const res = await axios.get(`${API}/api/admin/bookings`, {
      headers: { Authorization: `Bearer ${password}` }
    })
    setBookings(res.data)
  }

  const cancel = async (id) => {
    if (!confirm('Cancel this booking?')) return
    await axios.post(`${API}/api/admin/cancel`, { booking_id: id }, {
      headers: { Authorization: `Bearer ${password}` }
    })
    fetchBookings()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin — Bookings</h1>
        <a href="#" className="text-sm underline">Back to site</a>
      </header>

      <div className="card space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm mb-1">Admin password</label>
            <input type="password" className="w-full border rounded p-2"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" onClick={fetchBookings}>Load</button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Time</th>
                <th className="p-2">Name</th>
                <th className="p-2">Service</th>
                <th className="p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-t">
                  <td className="p-2">{b.date}</td>
                  <td className="p-2">{b.start_time}–{b.end_time}</td>
                  <td className="p-2">{b.full_name}</td>
                  <td className="p-2 capitalize">{b.service_type}</td>
                  <td className="p-2">{b.status}</td>
                  <td className="p-2">
                    {b.status !== 'cancelled' && (
                      <button className="btn" onClick={() => cancel(b.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td className="p-2" colSpan="6">No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
