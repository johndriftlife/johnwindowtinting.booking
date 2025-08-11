import { v4 as uuid } from 'uuid'

export const db = {
  bookings: [],
  admin: {
    shades: {
      carbon: [
        { shade: '50%', available: true },
        { shade: '35%', available: true },
        { shade: '20%', available: true },
        { shade: '5%',  available: true },
        { shade: '1%',  available: true }
      ],
      ceramic: [
        { shade: '20%', available: true },
        { shade: '5%',  available: true }
      ]
    },
    slotToggles: {}
  }
}

export function defaultSlotsFor(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const wd = d.getUTCDay()
  if (wd === 1) return [] // Monday closed
  if (wd >= 2 && wd <= 5) return [{ start: '14:00', end: '' }]
  if (wd === 6) return ['09:00','10:00','11:00','12:00','13:00','14:00'].map(h => ({ start: h, end: '' }))
  if (wd === 0) return [{ start: '10:00', end: '' }]
  return []
}

export function addBooking(payload) {
  const id = uuid()
  const rec = { id, status: 'pending', ...payload }
  db.bookings.push(rec)
  return rec
}
export function markPaid(bookingId) { const b = db.bookings.find(x => x.id === bookingId); if (b) b.status = 'paid'; return b }
export function getBookingsForDate(dateStr) { return db.bookings.filter(b => b.date === dateStr) }

// no-op stubs (avoid import errors from old code)
export function saveShades(){ return true }
export function saveSlots(){ return true }
