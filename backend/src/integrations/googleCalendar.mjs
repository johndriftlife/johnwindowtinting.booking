// backend/src/integrations/googleCalendar.mjs
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

function getJwtClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
  // Render-safe: turn \n sequences back into newlines
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('Google service account ENV missing')
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES
  })
}

/**
 * Create a calendar event. Returns event id.
 * booking: { id, full_name, phone, email, vehicle, tint_quality, tint_shades_json, date, start_time, end_time, amount_total, amount_deposit }
 */
export async function createCalendarEvent(booking) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not set')

  const auth = getJwtClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const tz = process.env.TZ || 'America/Guadeloupe'
  const startISO = `${booking.date}T${booking.start_time}:00`
  const endISO   = `${booking.date}T${booking.end_time}:00`

  let shades = []
  try { shades = JSON.parse(booking.tint_shades_json || '[]') } catch {}

  const summary = `Window Tint • ${booking.full_name}`
  const description =
    `Booking #${booking.id}\n` +
    `Name: ${booking.full_name}\n` +
    `Phone: ${booking.phone}\n` +
    `Email: ${booking.email}\n` +
    `Vehicle: ${booking.vehicle}\n` +
    `Quality: ${booking.tint_quality}\n` +
    `Shades: ${shades.join(', ') || '—'}\n` +
    `Deposit: €${(booking.amount_deposit/100).toFixed(2)} • Total: €${(booking.amount_total/100).toFixed(2)}\n`

  const requestBody = {
    summary,
    description,
    start: { dateTime: startISO, timeZone: tz },
    end:   { dateTime: endISO,   timeZone: tz },
    reminders: { useDefault: true }
  }

  const res = await calendar.events.insert({ calendarId, requestBody })
  return res.data.id
}
