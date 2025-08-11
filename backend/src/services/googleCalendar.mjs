// backend/src/services/googleCalendar.mjs
import { google } from 'googleapis'

export async function createCalendarEventSafe(booking) {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID, TZ } = process.env

  // If Calendar isn’t configured, do nothing (don’t crash the app)
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
    return
  }

  const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  const jwt = new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar']
  })
  const calendar = google.calendar({ version: 'v3', auth: jwt })

  const startTime = booking.start_time || '10:00'
  const endTime =
    booking.end_time && booking.end_time !== ''
      ? booking.end_time
      : String(parseInt(startTime.split(':')[0], 10) + 1).padStart(2, '0') + ':00'

  const start = `${booking.date}T${startTime}:00`
  const end = `${booking.date}T${endTime}:00`

  const summary = `Window Tint - ${booking.full_name}`
  const description = [
    `Vehicle: ${booking.vehicle}`,
    `Quality: ${booking.tint_quality}`,
    `Shades: ${(booking.tint_shades || []).join(', ')}`,
    `Windows: ${(booking.windows || []).join(', ')}`,
  ].join('\n')

  await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: {
      summary,
      description,
      start: { dateTime: start, timeZone: TZ || 'UTC' },
      end: { dateTime: end, timeZone: TZ || 'UTC' },
    },
  })
}
