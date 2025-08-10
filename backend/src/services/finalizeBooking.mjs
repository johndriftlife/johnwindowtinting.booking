// backend/src/services/finalizeBooking.mjs
import { createCalendarEvent } from '../integrations/googleCalendar.mjs'

/**
 * Finalize a booking: mark as deposit_paid, attach payment_intent_id,
 * create Google Calendar event (once), persist to disk.
 * Returns the updated booking.
 */
export async function finalizeBooking({ db, saveBookings }, { booking_id, payment_intent_id }) {
  const b = db.bookings.find(x => x.id === booking_id)
  if (!b) throw new Error('booking not found')

  b.payment_intent_id = payment_intent_id
  b.status = 'deposit_paid'

  try {
    if (!b.google_event_id) {
      const eventId = await createCalendarEvent(b)
      b.google_event_id = eventId
    }
  } catch (e) {
    // Don’t fail the booking if calendar insert fails
    console.error('Calendar error:', e?.message || e)
  }

  await saveBookings()
  return b
}
