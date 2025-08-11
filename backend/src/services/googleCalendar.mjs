// backend/src/services/googleCalendar.mjs
import { google } from 'googleapis'
export async function createCalendarEventSafe(booking) {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID } = process.env
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) { throw new Error('Calendar module not configured') }
  const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  const jwt = new google.auth.JWT({ email: GOOGLE_CLIENT_EMAIL, key: privateKey, scopes: ['https://www.googleapis.com/auth/calendar'] })
  const calendar = google.calendar({ version:'v3', auth: jwt })
  const start = `${booking.date}T${booking.start_time || '10:00'}:00`
  const end = booking.end_time && booking.end_time !== '' ? `${booking.date}T${booking.end_time}:00`
            : `${booking.date}T${(parseInt((booking.start_time||'10:00').split(':')[0],10)+1).toString().padStart(2,'0')}:00:00`
  const summary = `Window Tint - ${booking.full_name}`
  const description = [`Vehicle: ${booking.vehicle}`, `Quality: ${booking.tint_quality}`, `Shades: ${(booking.tint_shades||[]).join(', ')}`, `Windows: ${(booking.windows||[]).join(', ')}`].join('\n')
  await calendar.events.insert({ calendarId: GOOGLE_CALENDAR_ID, requestBody: { summary, description, start:{ dateTime:start }, end:{ dateTime:end } } })
}
