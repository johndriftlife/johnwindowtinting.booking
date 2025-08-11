// backend/src/services/googleCalendar.mjs
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!clientEmail || !privateKey) {
    throw new Error('Google credentials missing (GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY)')
  }
  // Convert literal \n into real newlines if pasted into env
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n')

  return new google.auth.JWT(clientEmail, null, privateKey, SCOPES)
}

function getCalendar() {
  const auth = getAuth()
  return google.calendar({ version: 'v3', auth })
}

function buildEventFromBooking(booking) {
  const tz = process.env.TIMEZONE || 'UTC'
  const startIso = `${booking.date}T${(booking.start_time || '00:00')}:00`
  const endIso   = `${booking.date}T${(booking.end_time   || booking.start_time || '00:00')}:00`

  const summary = `Window Tinting: ${booking.full_name || ''}`.trim()
  const descriptionLines = [
    `Phone: ${booking.phone || ''}`,
    `Email: ${booking.email || ''}`,
    `Vehicle: ${booking.vehicle || ''}`,
    `Tint: ${booking.tint_quality || ''} • Shades: ${
      Array.isArray(booking.tint_shades)
        ? booking.tint_shades.join(', ')
        : (booking.tint_shade || '')
    }`,
    `Windows: ${Array.isArray(booking.windows) ? booking.windows.join(', ') : ''}`,
    `Booking ID: ${booking.id || ''}`
  ]
  const description = descriptionLines.filter(Boolean).join('\n')

  return {
    summary,
    description,
    start: { dateTime: startIso, timeZone: tz },
    end:   { dateTime: endIso,   timeZone: tz }
  }
}

export async function createCalendarEvent(booking) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID is missing')

  const calendar = getCalendar()
  const event = buildEventFromBooking(booking)

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event
  })
  return res.data // { id, htmlLink, ... }
}

export async function updateCalendarEvent(booking) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID is missing')
  if (!booking.calendar_event_id) throw new Error('booking.calendar_event_id is missing')

  const calendar = getCalendar()
  const event = buildEventFromBooking(booking)

  const res = await calendar.events.patch({
    calendarId,
    eventId: booking.calendar_event_id,
    requestBody: event
  })
  return res.data
}

export async function deleteCalendarEvent(eventId) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID is missing')
  if (!eventId) return

  const calendar = getCalendar()
  await calendar.events.delete({ calendarId, eventId })
}
