// backend/src/services/googleCalendar.mjs
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!clientEmail || !privateKey) {
    throw new Error('Google credentials missing (GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY)')
  }
  // Render often stores \n escaped; fix if needed
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n')
  return new google.auth.JWT(clientEmail, null, privateKey, SCOPES)
}

export async function createCalendarEvent(booking) {
  const auth = getAuth()
  const calendar = google.calendar({ version: 'v3', auth })

  const tz = process.env.TIMEZONE || 'UTC'
  const calId = process.env.GOOGLE_CALENDAR_ID
  if (!calId) throw new Error('GOOGLE_CALENDAR_ID is missing')

  // booking.date is YYYY-MM-DD, times are "HH:MM"
  const startIso = `${booking.date}T${(booking.start_time || '00:00')}:00`
  const endIso   = `${booking.date}T${(booking.end_time || booking.start_time || '00:00')}:00`

  const summary = `Window Tinting: ${booking.full_name}`
  const descriptionLines = [
    `Phone: ${booking.phone || ''}`,
    `Email: ${booking.email || ''}`,
    `Vehicle: ${booking.vehicle || ''}`,
    `Tint: ${booking.tint_quality} • Shades: ${Array.isArray(booking.tint_shades) ? booking.tint_shades.join(', ') : (booking.tint_shade || '')}`,
    `Windows: ${Array.isArray(booking.windows) ? booking.windows.join(', ') : ''}`,
    `Booking ID: ${booking.id}`
  ]
  const description = descriptionLines.filter(Boolean).join('\n')

  const event = {
    summary,
    description,
    start: { dateTime: startIso, timeZone: tz },
    end:   { dateTime: endIso,   timeZone: tz }
  }

  const res = await calendar.events.insert({
    calendarId: calId,
    requestBody: event
  })

  return res.data // includes id, htmlLink, etc.
}
